"""EEF Learn AI service.

M0 scope: boots with validated env, health endpoint, mock provider wired.
M2 adds: job worker loop, generation pipelines, /retrieve.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException

from eef_ai import worker
from eef_ai.db import close_pool, get_pool
from eef_ai.providers import mock
from eef_ai.settings import Settings, load_settings

settings: Settings = load_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await get_pool(settings.database_url)
    stop = asyncio.Event()
    worker_task = asyncio.create_task(worker.worker_loop(pool, stop))
    yield
    stop.set()
    await worker_task
    await close_pool()


app = FastAPI(title="EEF Learn AI service", lifespan=lifespan)


def require_service_token(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """Bearer auth for web -> ai calls. Accepts current or next token (rotation overlap)."""
    valid = {settings.ai_service_token}
    if settings.ai_service_token_next:
        valid.add(settings.ai_service_token_next)
    if authorization is not None and authorization.removeprefix("Bearer ").strip() in valid:
        return
    raise HTTPException(status_code=401, detail="invalid or missing service token")


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "provider": settings.ai_provider,
        "model": settings.ai_model,
        "embeddings_dimensions": settings.embeddings_dimensions,
    }


@app.post("/dev/mock-skeleton", dependencies=[Depends(require_service_token)])
def dev_mock_skeleton(payload: dict) -> dict:
    """Dev-only demo of the mock provider (replaced by the M2 job pipeline)."""
    topic = str(payload.get("topic", "")).strip()
    if not topic:
        raise HTTPException(status_code=422, detail="topic is required")
    return mock.generate_map_skeleton(topic)
