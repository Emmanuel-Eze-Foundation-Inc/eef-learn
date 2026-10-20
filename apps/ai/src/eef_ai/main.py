"""EEF Learn AI service.

M0 scope: boots with validated env, health endpoint, mock provider wired.
M2 adds: job worker loop, generation pipelines, /retrieve.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
import sentry_sdk
from fastapi import Depends, FastAPI, Header, HTTPException

from eef_ai import worker
from eef_ai.agent.editor import run_editor, run_mock_editor
from eef_ai.db import close_pool, get_pool
from eef_ai.pipelines import section, skeleton  # noqa: F401 — registers job handlers
from eef_ai.providers import mock
from eef_ai.providers.base import get_provider
from eef_ai.providers.chat import NoUserModel, UserModel
from eef_ai.settings import Settings, load_settings

settings: Settings = load_settings()

if settings.sentry_dsn:
    # Requests carry users' model keys: never attach bodies or stack-frame locals to a report.
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        send_default_pii=False,
        max_request_body_size="never",
        include_local_variables=False,
        traces_sample_rate=0.1,
    )


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
        "embeddings_dimensions": settings.embeddings_dimensions,
    }


@app.post("/chat", dependencies=[Depends(require_service_token)])
async def chat(payload: dict) -> dict:
    """Companion chat (ticket T12). Interactive path — no job queue.

    payload: {"messages": [{"role", "content"}, ...], "userModel"?} — web owns persistence.
    """
    messages = payload.get("messages")
    if not isinstance(messages, list) or not messages:
        raise HTTPException(status_code=422, detail="messages[] is required")
    user = UserModel.parse(payload.get("userModel"))
    try:
        provider = get_provider(settings, user)
    except NoUserModel as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    try:
        reply = await provider.chat(messages)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:400]) from exc
    return {"reply": reply}


@app.post("/agent/course-edit", dependencies=[Depends(require_service_token)])
async def course_edit(payload: dict) -> dict:
    """Course agent turn: {course, message, focus?, history?, userModel?} -> {reply, ops}.

    Interactive like /chat. The web app validates ownership and applies the ops.
    """
    course = payload.get("course")
    message = str(payload.get("message") or "").strip()
    if not isinstance(course, dict) or not message:
        raise HTTPException(status_code=422, detail="course and message are required")
    focus = payload.get("focus") if isinstance(payload.get("focus"), str) else None
    history = payload.get("history") if isinstance(payload.get("history"), list) else []
    user = UserModel.parse(payload.get("userModel"))
    if not user:
        if settings.ai_provider == "mock":
            return run_mock_editor(course=course, message=message, focus=focus)
        raise HTTPException(status_code=409, detail="connect your own AI to use the course agent")
    try:
        return await run_editor(settings, course=course, message=message, focus=focus, history=history, user=user)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=str(exc)[:400]) from exc


@app.post("/dev/mock-skeleton", dependencies=[Depends(require_service_token)])
def dev_mock_skeleton(payload: dict) -> dict:
    """Dev-only demo of the mock provider (replaced by the M2 job pipeline)."""
    topic = str(payload.get("topic", "")).strip()
    if not topic:
        raise HTTPException(status_code=422, detail="topic is required")
    return mock.generate_map_skeleton(topic)
