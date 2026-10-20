"""Provider abstraction: the user's own model, or the deterministic mock when AI_PROVIDER=mock."""

from typing import Any, Protocol

from eef_ai.providers import mock
from eef_ai.providers.chat import ChatModelProvider, NoUserModel, UserModel
from eef_ai.settings import Settings


class Provider(Protocol):
    async def map_skeleton(self, topic: str, brief: dict[str, Any] | None = None) -> dict[str, Any]: ...

    async def section_text(self, *, topic: str, node_slug: str, node_title: str) -> dict[str, Any]: ...

    async def module_beats(
        self,
        *,
        topic: str,
        node_slug: str,
        node_title: str,
        youtube_hits: list[dict[str, str]] | None = None,
    ) -> list[dict[str, Any]]: ...

    async def chat(self, messages: list[dict[str, str]]) -> str: ...

    async def embed(self, texts: list[str], dimensions: int) -> list[list[float]]: ...


class MockProvider:
    """Adapts the deterministic mock module to the async Provider protocol."""

    async def map_skeleton(self, topic: str, brief: dict[str, Any] | None = None) -> dict[str, Any]:
        return mock.generate_map_skeleton(topic, brief)

    async def section_text(self, *, topic: str, node_slug: str, node_title: str) -> dict[str, Any]:
        return mock.generate_section_text(node_slug)

    async def module_beats(
        self,
        *,
        topic: str,
        node_slug: str,
        node_title: str,
        youtube_hits: list[dict[str, str]] | None = None,
    ) -> list[dict[str, Any]]:
        return mock.generate_module_beats(node_slug, node_title)

    async def chat(self, messages: list[dict[str, str]]) -> str:
        return mock.chat(messages)

    async def embed(self, texts: list[str], dimensions: int) -> list[list[float]]:
        return mock.embed(texts, dimensions)


def get_provider(settings: Settings, user: UserModel | None) -> Provider:
    """The user's model; the mock only when this instance runs in mock mode. Never a platform key."""
    if user:
        return ChatModelProvider(settings, user)
    if settings.ai_provider == "mock":
        return MockProvider()
    raise NoUserModel("connect your own AI: add a model key in Settings, or build over MCP")
