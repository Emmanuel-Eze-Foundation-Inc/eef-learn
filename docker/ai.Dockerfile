FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
COPY pyproject.toml ./
RUN uv sync --no-dev --no-install-project || uv sync --no-dev || true
COPY . .
RUN uv sync --no-dev

EXPOSE 8000
# Cloud Run sets PORT; compose and local runs use 8000.
CMD ["sh", "-c", "exec uv run uvicorn eef_ai.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
