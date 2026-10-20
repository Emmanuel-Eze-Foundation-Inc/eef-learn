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

    # --- Shared AI contract (identical env names in apps/web) ---
    # The platform holds no model key; every call runs on the user's own key.
    # mock: keyless users get deterministic output. Anything else: real models only.
    ai_provider: AiProvider = "mock"
    ai_model: str = "mock-model"

    # Per-task OpenRouter model routing for users on OpenRouter (all fall back to ai_model)
    ai_model_skeleton: str | None = None
    ai_model_section: str | None = None
    ai_model_chat: str | None = None
    ai_model_enrich: str | None = None

    # --- Embeddings ---
    embeddings_model: str = "mock-embeddings"
    embeddings_dimensions: int = 768
    youtube_api_key: str | None = None

    # --- Error reports (off when unset) ---
    sentry_dsn: str | None = None
    sentry_environment: str = "development"

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

    return settings
