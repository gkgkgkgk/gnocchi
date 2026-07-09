"""Anthropic client + a small `call_structured` helper.

Every LLM call in the app funnels through `call_structured`, which:
- forces the model to emit exactly one tool call whose schema matches a
  pydantic model,
- applies prompt caching to the (usually large) system prompt so repeated
  calls hit cache and cost roughly nothing,
- lets the SDK's built-in retry handle 529s and transient failures.

If a user wants a plain text response instead (e.g. the future /ai/chat
streaming endpoint), call `client.messages.create` directly."""

from __future__ import annotations

from typing import Any, TypeVar

from anthropic import AsyncAnthropic
from fastapi import HTTPException
from pydantic import BaseModel

from app.config import settings

client = AsyncAnthropic(api_key=settings.anthropic_api_key or "dummy", max_retries=3)


T = TypeVar("T", bound=BaseModel)


# Model tiers. Kept here so callers say "the extraction model" rather than
# hardcoding a specific model string all over.
MODEL_FAST = "claude-sonnet-4-6"       # extraction, annotation, analysis, transform
MODEL_STRONG = "claude-opus-4-7"       # recipe generation from a pitch (Phase 5)


async def call_structured(
    *,
    model: str,
    system: str,
    user: str | list[dict[str, Any]],
    tool_name: str,
    tool_description: str,
    schema: type[T],
    max_tokens: int = 4096,
) -> T:
    """Force Claude to emit one tool call and parse it into `schema`.

    `user` can be a plain string or a list of Anthropic content blocks
    (for vision — pass image blocks alongside a text block).
    """
    content = user if isinstance(user, list) else [{"type": "text", "text": user}]
    response = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=[
            {
                "type": "text",
                "text": system,
                # Ephemeral cache: system prompt is cached for ~5min after
                # first use. Second call within the window skips reparse.
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tools=[
            {
                "name": tool_name,
                "description": tool_description,
                "input_schema": schema.model_json_schema(),
            }
        ],
        tool_choice={"type": "tool", "name": tool_name},
        messages=[{"role": "user", "content": content}],
    )
    for block in response.content:
        if block.type == "tool_use":
            try:
                return schema(**block.input)
            except Exception as e:
                raise HTTPException(
                    status_code=502,
                    detail=f"Model returned invalid structured output for {tool_name}: {e}",
                )
    raise HTTPException(
        status_code=502,
        detail=f"Model returned no tool call for {tool_name}",
    )
