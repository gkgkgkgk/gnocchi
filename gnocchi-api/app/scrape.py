"""Recipe URL scraping.

Preference order: (1) schema.org/Recipe JSON-LD (a huge fraction of recipe
sites embed it; when present, we skip the LLM entirely and the extraction
is essentially perfect). (2) Recipe-container div classes (wprm, tasty,
etc.). (3) Whole-page fallback.

Returns a dict shaped `{jsonld?, raw_text?, source_url, source_image}` —
callers check `jsonld` first and only fall back to `raw_text` + LLM.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

TIMEOUT = 10.0


def _find_jsonld_recipe(soup: BeautifulSoup) -> dict[str, Any] | None:
    """Return the first schema.org/Recipe blob on the page, or None."""
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue

        candidates: list[Any] = []
        if isinstance(data, list):
            candidates.extend(data)
        elif isinstance(data, dict):
            candidates.append(data)
            if isinstance(data.get("@graph"), list):
                candidates.extend(data["@graph"])

        for c in candidates:
            if not isinstance(c, dict):
                continue
            t = c.get("@type")
            if t == "Recipe" or (isinstance(t, list) and "Recipe" in t):
                return c
    return None


def _extract_recipe_text(soup: BeautifulSoup) -> str:
    recipe_classes = ["tasty-recipes", "wprm-recipe-container", "recipe-container", "recipe-card"]
    containers = []
    for cls in recipe_classes:
        containers.extend(soup.find_all("div", class_=lambda c: c and cls in c))

    if containers:
        chunks: list[str] = []
        for c in containers:
            blocks = c.find_all(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "div"], recursive=True)
            if blocks:
                chunks.append("\n".join(b.get_text(separator=" ", strip=True) for b in blocks if b.get_text(strip=True)))
            else:
                chunks.append(c.get_text(separator=" ", strip=True))
        text = "\n\n".join(chunks)[:8000]
    else:
        blocks = soup.find_all(["p", "ul", "li", "h1", "h2", "h3", "h4", "h5", "h6", "hr"])
        text = "\n".join(b.get_text(strip=True) for b in blocks if len(b.get_text(strip=True)) > 20)[:8000]

    if not text:
        raise HTTPException(status_code=400, detail="No readable content found on page.")
    return text


async def _fetch(url: str) -> str:
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as c:
        try:
            resp = await c.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; Gnocchi/1.0)"})
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}") from e
        return resp.text


async def scrape_website(url: str) -> dict[str, Any]:
    html = await _fetch(url)
    soup = BeautifulSoup(html, "html.parser")

    og = soup.find("meta", property="og:image")
    cover = og["content"] if og else None

    jsonld = _find_jsonld_recipe(soup)
    if jsonld:
        return {"jsonld": jsonld, "source_image": cover, "source_url": url}

    return {"raw_text": _extract_recipe_text(soup), "source_image": cover, "source_url": url}


async def scrape_instagram(url: str) -> dict[str, Any]:
    """Instagram posts don't embed JSON-LD recipes; the recipe (if any) lives
    in the caption. We read it from og:description / og:title meta tags, which
    Instagram populates even without login, and hand the text to the LLM."""
    html = await _fetch(url)
    soup = BeautifulSoup(html, "html.parser")

    def _meta(prop: str) -> str | None:
        tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        return tag.get("content") if tag else None

    cover = _meta("og:image")
    caption = _meta("og:description") or ""
    title = _meta("og:title") or ""

    # og:description is usually: '123 likes, 4 comments - user on Date: "CAPTION"'
    # Pull the quoted caption when present, else use the whole thing.
    import re

    m = re.search(r'[:\-]\s*"(.+)"\s*$', caption, re.S)
    text = (m.group(1) if m else caption).strip()
    if len(text) < 20:
        raise HTTPException(
            status_code=400,
            detail="Couldn't read a caption from that Instagram post. It may be private, or the recipe isn't in the caption.",
        )

    combined = f"{title}\n\n{text}" if title else text
    return {"raw_text": combined, "source_image": cover, "source_url": url}


async def scrape_pinterest(url: str) -> dict[str, Any]:
    """Follow a pin's outbound link to the actual recipe site, then scrape it."""
    html = await _fetch(url)
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", property="og:image")
    cover = og["content"] if og else None

    outbound: str | None = None
    for meta in soup.find_all("meta"):
        if meta.get("property") in {"og:url", "al:ios:url", "al:android:url"}:
            candidate = meta.get("content")
            if candidate and "pin.it" not in candidate and "pinterest.com" not in candidate:
                outbound = candidate
                break
    if not outbound:
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if not href.startswith("/") and "pinterest.com" not in href:
                outbound = href
                break
    if not outbound:
        raise HTTPException(status_code=400, detail="No external recipe link found on this pin.")

    recipe_html = await _fetch(outbound)
    recipe_soup = BeautifulSoup(recipe_html, "html.parser")
    jsonld = _find_jsonld_recipe(recipe_soup)
    if jsonld:
        return {"jsonld": jsonld, "source_image": cover, "source_url": outbound}
    return {"raw_text": _extract_recipe_text(recipe_soup), "source_image": cover, "source_url": outbound}
