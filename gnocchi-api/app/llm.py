"""Async OpenAI client. Phase 2 swaps to Anthropic; interface stays the same."""

from openai import AsyncOpenAI

from app.config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key or "dummy")
