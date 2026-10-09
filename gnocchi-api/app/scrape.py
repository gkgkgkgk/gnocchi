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
import asyncio
import ipaddress
import socket
from typing import Any
from urllib.parse import urljoin, urlsplit

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

TIMEOUT = 10.0
MAX_HTML_BYTES = 2 * 1024 * 1024


async def _check_public_url(url: str) -> None:
    """Imports are for public recipe sites, never services on the home LAN."""
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="Enter a public http or https recipe URL.")
    try:
        addresses = await asyncio.to_thread(socket.getaddrinfo, parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except (socket.gaierror, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Recipe site could not be resolved.") from exc
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise HTTPException(status_code=400, detail="Recipe URL must point to a public site.")


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
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False, trust_env=False) as c:
        for _ in range(6):
            await _check_public_url(url)
            try:
                async with c.stream("GET", url, headers={"User-Agent": "Mozilla/5.0 (compatible; Gnocchi/1.0)"}) as resp:
                    if resp.is_redirect:
                        location = resp.headers.get("location")
                        if not location:
                            raise HTTPException(status_code=400, detail="Recipe site redirected without a destination.")
                        url = urljoin(url, location)
                        continue
                    resp.raise_for_status()
                    if "text/html" not in resp.headers.get("content-type", ""):
                        raise HTTPException(status_code=400, detail="Recipe URL did not return a web page.")
                    chunks = []
                    size = 0
                    async for chunk in resp.aiter_bytes():
                        size += len(chunk)
                        if size > MAX_HTML_BYTES:
                            raise HTTPException(status_code=413, detail="Recipe page is too large to import.")
                        chunks.append(chunk)
                    return b"".join(chunks).decode(resp.encoding or "utf-8", errors="replace")
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=400, detail=f"Failed to fetch recipe page: {exc}") from exc
    raise HTTPException(status_code=400, detail="Recipe site redirected too many times.")


async def scrape_website(url: str) -> dict[str, Any]:
    html = await _fetch(url)
    soup = BeautifulSoup(html, "html.parser")

    og = soup.find("meta", property="og:image")
    cover = og["content"] if og else None

    jsonld = _find_jsonld_recipe(soup)
    if jsonld:
        return {"jsonld": jsonld, "source_image": cover, "source_url": url}

    return {"raw_text": _extract_recipe_text(soup), "source_image": cover, "source_url": url}


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
