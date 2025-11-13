from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bs4 import BeautifulSoup
import requests
from openai import OpenAI
import json

def extract_recipe_text(soup: BeautifulSoup) -> str:
    """Extract recipe text from a BeautifulSoup object, prioritizing recipe containers."""
    # First, check for common recipe container divs
    recipe_containers = []
    recipe_classes = ["tasty-recipes", "wprm-recipe-container", "recipe-container", "recipe-card"]
    
    for class_name in recipe_classes:
        containers = soup.find_all("div", class_=lambda c: c and class_name in c)
        if containers:
            recipe_containers.extend(containers)
    
    # If we found recipe containers, grab all of them
    if recipe_containers:
        container_texts = []
        for container in recipe_containers:
            # Extract block-level elements to preserve structure
            blocks = container.find_all(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "div"], recursive=True)
            if blocks:
                text = "\n".join(
                    block.get_text(separator=" ", strip=True)
                    for block in blocks
                    if block.get_text(strip=True)
                )
            else:
                # Fallback to getting all text if no blocks found
                text = container.get_text(separator=" ", strip=True)
            if text:
                container_texts.append(text)
        raw_text = "\n\n".join(container_texts)[:8000]
    else:
        # Fallback: extract from entire page
        paragraphs = soup.find_all(["p", "ul", "li", "h1", "h2", "h3", "h4", "h5", "h6", "hr"])
        raw_text = "\n".join(
            p.get_text(strip=True)
            for p in paragraphs
            if len(p.get_text(strip=True)) > 20
        )[:8000]
    
    if not raw_text:
        raise HTTPException(status_code=400, detail="No readable content found on page.")
    
    return raw_text

def scrape_website(url: str) -> dict:
    """Scrape a recipe website directly."""
    try:
        resp = requests.get(url, allow_redirects=True, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")
    
    soup = BeautifulSoup(resp.text, "html.parser")
    
    # Get the cover image
    og_image = soup.find("meta", property="og:image")
    cover_image = og_image["content"] if og_image else None
    
    # Extract recipe text
    raw_text = extract_recipe_text(soup)
    
    return {
        "raw_text": raw_text,
        "source_image": cover_image,
        "source_url": url,
    }

def scrape_pinterest_link(url: str) -> dict:
    """Fetch a Pinterest pin, follow its outbound link, and extract text + cover image."""
    try:
        resp = requests.get(url, allow_redirects=True, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch Pinterest URL: {e}")

    soup = BeautifulSoup(resp.text, "html.parser")

    # --- Get the cover image (for the pin itself) ---
    og_image = soup.find("meta", property="og:image")
    cover_image = og_image["content"] if og_image else None

    # --- Try to find the outbound recipe link ---
    outbound_link = None
    for meta_tag in soup.find_all("meta"):
        if meta_tag.get("property") in ["og:url", "al:ios:url", "al:android:url"]:
            possible = meta_tag.get("content")
            if possible and "pin.it" not in possible and "pinterest.com" not in possible:
                outbound_link = possible
                break

    # Fallback: look for <a> tags with external hrefs
    if not outbound_link:
        links = [
            a["href"] for a in soup.find_all("a", href=True)
            if not a["href"].startswith("/") and "pinterest.com" not in a["href"]
        ]
        if links:
            outbound_link = links[0]

    # --- If we found an external recipe link, fetch it ---
    if not outbound_link:
        raise HTTPException(status_code=400, detail="No external recipe link found on this pin.")

    try:
        recipe_resp = requests.get(outbound_link, timeout=10)
        recipe_resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch linked recipe: {e}")

    recipe_soup = BeautifulSoup(recipe_resp.text, "html.parser")

    # Extract recipe text using the shared function
    raw_text = extract_recipe_text(recipe_soup)

    return {
        "raw_text": raw_text,
        "source_image": cover_image,
        "source_url": outbound_link,
    }