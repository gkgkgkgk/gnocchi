"""Recipe URL scraping. httpx for async fetch, bs4 for parsing.

Handles: (a) generic recipe websites — prefer known WPRM/Tasty containers,
fall back to any dense block. (b) Pinterest pins — follow the outbound
link to the actual recipe site.
"""

from __future__ import annotations

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException


TIMEOUT = 10.0


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


async def scrape_website(url: str) -> dict[str, str | None]:
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}") from e

    soup = BeautifulSoup(resp.text, "html.parser")
    og = soup.find("meta", property="og:image")
    cover = og["content"] if og else None
    return {
        "raw_text": _extract_recipe_text(soup),
        "source_image": cover,
        "source_url": url,
    }


async def scrape_pinterest(url: str) -> dict[str, str | None]:
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch Pinterest URL: {e}") from e

        soup = BeautifulSoup(resp.text, "html.parser")
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

        try:
            recipe_resp = await client.get(outbound)
            recipe_resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch linked recipe: {e}") from e

    recipe_soup = BeautifulSoup(recipe_resp.text, "html.parser")
    return {
        "raw_text": _extract_recipe_text(recipe_soup),
        "source_image": cover,
        "source_url": outbound,
    }
