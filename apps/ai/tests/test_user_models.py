import pytest

from eef_ai.providers.base import MockProvider, get_provider
from eef_ai.providers.chat import (
    DEFAULT_MODELS,
    PROVIDER_DEFAULT_MODEL,
    ChatModelProvider,
    NoUserModel,
    UserModel,
    resolve_model,
)


class _Settings:
    def __init__(self, model: str, provider: str = "openrouter"):
        self.ai_model = model
        self.ai_provider = provider

    def model_for(self, task: str) -> str:
        return self.ai_model


def test_parse_rejects_missing_or_unknown():
    assert UserModel.parse(None) is None
    assert UserModel.parse({"provider": "openai"}) is None
    assert UserModel.parse({"provider": "mystery", "key": "k"}) is None
    assert UserModel.parse({"provider": "openai", "key": "  "}) is None


def test_parse_trims_and_drops_blank_model():
    user = UserModel.parse({"provider": "anthropic", "key": " sk-ant-x ", "model": " "})
    assert user == UserModel("anthropic", "sk-ant-x", None)


def test_openrouter_never_sends_mock_model():
    user = UserModel("openrouter", "sk-or-x")
    assert resolve_model(_Settings("mock-model"), user, "skeleton") == DEFAULT_MODELS["skeleton"]


def test_openrouter_uses_configured_task_model():
    user = UserModel("openrouter", "sk-or-x")
    assert resolve_model(_Settings("anthropic/claude-sonnet-4.5"), user, "chat") == "anthropic/claude-sonnet-4.5"


@pytest.mark.parametrize("provider", ["openai", "anthropic", "google"])
def test_direct_providers_use_their_default(provider):
    user = UserModel(provider, "k")
    assert resolve_model(_Settings("anthropic/claude-sonnet-4.5"), user, "skeleton") == PROVIDER_DEFAULT_MODEL[provider]


def test_user_model_choice_wins():
    user = UserModel("google", "k", "gemini-3.8-pro")
    assert resolve_model(_Settings("x"), user, "section") == "gemini-3.8-pro"


def test_web_search_only_on_openrouter():
    assert ChatModelProvider(_Settings("x"), UserModel("openrouter", "k")).web_search
    assert not ChatModelProvider(_Settings("x"), UserModel("openai", "k")).web_search


def test_get_provider_never_falls_back_to_a_platform_key():
    with pytest.raises(NoUserModel):
        get_provider(_Settings("openai/gpt-4o-mini"), None)
    assert isinstance(get_provider(_Settings("mock-model", "mock"), None), MockProvider)
    assert isinstance(get_provider(_Settings("mock-model", "mock"), UserModel("openai", "k")), ChatModelProvider)
