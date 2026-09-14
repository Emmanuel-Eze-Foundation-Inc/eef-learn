"""Provider abstraction: mock (default, deterministic) and OpenRouter (hosted default)."""

from typing import Any, Protocol

from eef_ai.providers import mock
from eef_ai.settings import Settings


class Provider(Protocol):
    async def map_skeleton(self, topic: str, brief: dict[str, Any] | None = None) -> dict[str, Any]: ...

    async def section_text(self, *, topic: str, node_slug: str, node_title: str) -> dict[str, Any]: ...

    async def chat(self, messages: list[dict[str, str]]) -> str: ...

    async def embed(self, texts: list[str], dimensions: int) -> list[list[float]]: ...


class MockProvider:
    """Adapts the deterministic mock module to the async Provider protocol."""

    async def map_skeleton(self, topic: str, brief: dict[str, Any] | None = None) -> dict[str, Any]:
        return mock.generate_map_skeleton(topic, brief)

    async def section_text(self, *, topic: str, node_slug: str, node_title: str) -> dict[str, Any]:
        return mock.generate_section_text(node_slug)

    async def chat(self, messages: list[dict[str, str]]) -> str:
        return mock.chat(messages)

    async def embed(self, texts: list[str], dimensions: int) -> list[list[float]]:
        return mock.embed(texts, dimensions)


def get_provider(settings: Settings, user_api_key: str | None = None) -> Provider:
    if user_api_key:
        from eef_ai.providers.openrouter import OpenRouterProvider

        return OpenRouterProvider(settings, api_key=user_api_key)
    if settings.ai_provider == "mock":
        return MockProvider()
    # openrouter / openai / openai-compatible all speak the same chat-completions dialect
    from eef_ai.providers.openrouter import OpenRouterProvider

    return OpenRouterProvider(settings)
