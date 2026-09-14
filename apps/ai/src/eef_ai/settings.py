"""Boot-time validated settings.

Every missing/invalid var errors with: problem + cause + fix + docs link.
This is the operator error contract from PLAN.md M0.
"""

from typing import Literal

from pydantic import ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DOCS = "https://github.com/Emmanuel-Eze-Foundation-Inc/eef-learn/blob/main/docs/self-hosting.md"

AiProvider = Literal["mock", "openrouter", "openai", "anthropic", "google", "openai-compatible"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Database ---
    database_url: str

    # --- Service auth (web <-> ai bearer tokens; dual tokens for rotation overlap) ---
    ai_service_token: str
    ai_service_token_next: str | None = None

    # --- Shared AI provider contract (identical env names in apps/web) ---
    ai_provider: AiProvider = "mock"
    ai_model: str = "mock-model"
    ai_api_key: str | None = None
    ai_base_url: str | None = None  # enables Ollama / any OpenAI-compatible endpoint

    # Per-task model routing (all fall back to ai_model)
    ai_model_skeleton: str | None = None
    ai_model_section: str | None = None
    ai_model_chat: str | None = None
    ai_model_enrich: str | None = None

    # --- Embeddings ---
    embeddings_model: str = "mock-embeddings"
    embeddings_dimensions: int = 768

    @field_validator("database_url")
    @classmethod
    def _check_db(cls, v: str) -> str:
        if not v.startswith(("postgres://", "postgresql://")):
            raise ValueError(
                "DATABASE_URL must be a postgres:// URL.\n"
                "  cause: the AI service talks directly to Postgres for jobs and checkpoints\n"
                "  fix:   copy the value from .env.example or run `docker compose up postgres`\n"
                f"  docs:  {DOCS}#database"
            )
        return v

    def model_for(self, task: Literal["skeleton", "section", "chat", "enrich"]) -> str:
        return getattr(self, f"ai_model_{task}") or self.ai_model


def load_settings() -> Settings:
    """Load settings, converting validation errors into the operator error contract."""
    try:
        settings = Settings()
    except ValidationError as e:
        lines = ["", "=" * 72, "EEF AI service cannot start: invalid environment", "=" * 72]
        for err in e.errors():
            var = str(err["loc"][0]).upper() if err["loc"] else "?"
            msg = err["msg"]
            lines.append(f"\nproblem: {var} — {msg}")
            if "Field required" in msg:
                lines.append(f"  cause: {var} is not set in the environment or .env")
                lines.append(f"  fix:   add {var}=... to your .env (see .env.example)")
            lines.append(f"  docs:  {DOCS}")
        lines.append("")
        raise SystemExit("\n".join(lines)) from None

    if settings.ai_provider != "mock" and not settings.ai_api_key:
        raise SystemExit(
            f"\nproblem: AI_PROVIDER={settings.ai_provider} but AI_API_KEY is not set\n"
            "  cause: every non-mock provider needs a key\n"
            "  fix:   set AI_API_KEY, or set AI_PROVIDER=mock (no key, deterministic output)\n"
            f"  docs:  {DOCS}#ai-providers"
        )
    return settings
