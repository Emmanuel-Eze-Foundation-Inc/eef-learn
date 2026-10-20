import { card, code, quiz, tutorial, type LessonSpec } from "../../course-spec";

export const m6: LessonSpec = {
  slug: "shipping",
  title: "Shipping AI products",
  blocks: [
    {
      type: "ai_text",
      title: "What this module gives you",
      body: `Now you turn a working script into a service other people can use. You will design the architecture of an AI product, package it in a container and deploy it, and add the observability you need to know what it is doing and what it costs.

By the end you will have a deployable API with streaming, configuration through environment variables, health checks, and traces of every model call.`,
    },
  ],
  lessons: [
    {
      slug: "architecture",
      title: "AI product architecture",
      blocks: [
        {
          type: "ai_text",
          title: "The boxes and arrows",
          body: `A typical AI product has the same shape as most web products, with a few extra parts.

**The core request path**
1. **Client** (web or mobile app) sends the request to your backend. Never call model APIs directly from the browser: it exposes your key and skips your rules.
2. **API server** authenticates the user, checks rate limits and quotas, and validates input.
3. **AI layer** builds the context (prompt templates, retrieval, history), calls the model through a **gateway**, runs tools, validates output.
4. **Response** streams back to the client.

**Supporting parts**
- **Model gateway:** one internal interface for all model calls, which adds retries, fallbacks, caching, logging and cost tracking in one place. It can be your own thin wrapper or a hosted router.
- **Data stores:** your main database (users, conversations), a vector index (often the same Postgres with pgvector), and object storage for files.
- **Background workers and a queue** for slow jobs: document ingestion, long agent tasks, batch processing. Users get a job id immediately and see progress.
- **Prompt and config registry:** versioned prompts and model settings, so you can change them without a deploy and know which version produced which output.
- **Observability:** traces, metrics and logs for every request (lesson 3).
- **Eval pipeline:** your eval suite run in CI and on samples of production traffic.

**Design principles**
- **Keep the AI layer behind an interface** so you can swap models, providers and frameworks.
- **Make slow things asynchronous.** Anything over a few seconds that the user does not need to watch belongs in a queue.
- **Store what you need to debug:** the prompt version, model, retrieved sources and output for each response.
- **Plan for failure of the model provider.** It will go down or slow down; decide in advance what users see.`,
        },
        {
          type: "code",
          title: "app.py (FastAPI, streaming)",
          body: code(
            "python",
            `
# pip install fastapi uvicorn openai   then:  uvicorn app:app --reload
import os
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

app = FastAPI()
llm = AsyncOpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])
MODEL = os.environ.get("MODEL", "openai/gpt-4o-mini")

class Ask(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

def current_user(authorization: str = Header(default="")) -> str:
    if authorization != f"Bearer {os.environ['APP_TOKEN']}":
        raise HTTPException(status_code=401)
    return "demo-user"

@app.get("/health")
def health() -> dict:
    return {"ok": True}

@app.post("/ask")
async def ask(body: Ask, user: str = Depends(current_user)) -> StreamingResponse:
    stream = await llm.chat.completions.create(
        model=MODEL, stream=True, max_tokens=800,
        messages=[{"role": "system", "content": "Answer concisely."}, {"role": "user", "content": body.question}],
    )

    async def tokens():
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    return StreamingResponse(tokens(), media_type="text/plain")
`,
          ),
        },
        {
          type: "blog",
          title: "Building a generative AI platform",
          url: "https://huyenchip.com/2024/07/25/genai-platform.html",
          body: "Chip Huyen builds up the architecture of a production AI platform one component at a time: context, guardrails, router and gateway, caching, agents, and observability. The best single diagram of where everything goes.",
          source: { type: "blog", name: "Chip Huyen", url: "https://huyenchip.com/2024/07/25/genai-platform.html" },
        },
        {
          type: "resource",
          title: "FastAPI",
          url: "https://fastapi.tiangolo.com",
          body: "The Python web framework used in this course's examples: typed request validation, async support and automatic API docs.",
          source: { type: "resource", name: "FastAPI", url: "https://fastapi.tiangolo.com" },
        },
        tutorial(
          "0sOvCWFmrtA",
          "Build a complete Python API with FastAPI",
          "freeCodeCamp.org",
          "A long, thorough course: routes, validation, Postgres, SQLAlchemy, migrations, authentication with JWTs, testing, Docker and deployment. You don't need all of it now; work through authentication and the database sections, which every AI backend needs.",
          { optional: true },
        ),
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Users upload 200-page PDFs to be indexed for search. How should your API handle the upload?",
            [
              "Process the whole PDF inside the HTTP request before responding",
              "Store the file, enqueue an ingestion job, and return a job id the client can poll",
              "Send the PDF straight from the browser to the model provider",
              "Ask users to upload smaller files only",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "deploy",
      title: "Containerise and deploy",
      blocks: [
        {
          type: "ai_text",
          title: "Same box everywhere",
          body: `**Containers** package your code, its dependencies and its runtime into one image that runs the same on your laptop, in CI and in production. Docker is the standard tool.

**Twelve-factor habits that matter most for AI services**
- **Config in the environment.** API keys, model names, database URLs and feature flags come from environment variables, not code. Secrets go in your platform's secret manager.
- **Stateless processes.** Don't keep conversations or uploads in memory or on local disk; use the database and object storage. Then you can run many copies and restart any of them.
- **Logs to stdout.** Let the platform collect them.
- **Dev/prod parity.** Same image, different config.

**A good Dockerfile for a Python AI service**
- Start from a slim official base image.
- Install dependencies in a separate layer *before* copying your code, so rebuilds are fast.
- Run as a non-root user.
- Bind to the port the platform gives you (\`$PORT\`).
- Add a health check endpoint the platform can probe.

**Where to run it.** For most AI products, a managed container platform is the right start: Google Cloud Run, AWS App Runner or ECS, Fly.io, Railway, Render or Heroku. You push an image; they run it, scale it with traffic, and give you HTTPS. Serverless containers like Cloud Run scale to zero when idle, which keeps early costs near nothing. Kubernetes gives you more control and is worth it at larger scale or when you run your own GPU models; it is rarely the right first step.

**Ship safely**
- **CI pipeline:** on every push, run unit tests and your eval suite, build the image, and deploy to staging.
- **Promote** the same image to production after it passes.
- **Roll out gradually** for big changes (a small percentage of traffic first) and keep a one-command rollback.
- **Watch long requests:** many platforms have request timeouts. Streaming responses and background jobs keep you within them.`,
        },
        {
          type: "youtube",
          title: "Docker in 100 seconds",
          url: "https://www.youtube.com/watch?v=Gjnup-PuquQ",
          body: "Fireship's fast overview of images, containers and Dockerfiles. Then work through Docker's own getting-started guide below to build one yourself.",
          source: { type: "youtube", name: "Fireship", url: "https://www.youtube.com/watch?v=Gjnup-PuquQ" },
        },
        tutorial(
          "3c-iBn73dDE",
          "Docker, the full course",
          "TechWorld with Nana",
          "Images, containers, Dockerfiles, Docker Compose, volumes and registries, built hands-on. Exercise: containerise the FastAPI app from the last lesson with the Dockerfile below, and run it next to Postgres with Docker Compose.",
          { optional: true },
        ),
        tutorial(
          "s2TIWIzCftM",
          "Deploy a Python service to Cloud Run",
          "Google Cloud Tech",
          "A short walkthrough of building a container and deploying it to a managed platform, then finding errors in the logs. The same flow works on most container platforms.",
        ),
        {
          type: "code",
          title: "Dockerfile",
          body: code(
            "dockerfile",
            `
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN useradd --create-home appuser
USER appuser

ENV PORT=8080
EXPOSE 8080
HEALTHCHECK CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://localhost:{os.environ[\\"PORT\\"]}/health')"
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port $PORT --workers 2"]
`,
          ),
        },
        {
          type: "resource",
          title: "Docker: get started",
          url: "https://docs.docker.com/get-started/",
          body: "Docker's official tutorial: build an image, run a container, and share it through a registry.",
          source: { type: "resource", name: "Docker", url: "https://docs.docker.com/get-started/" },
        },
        {
          type: "resource",
          title: "The Twelve-Factor App",
          url: "https://12factor.net",
          body: "The classic short guide to building services that deploy and scale cleanly. Read factors III (config), VI (processes) and XI (logs) first.",
          source: { type: "resource", name: "12factor.net", url: "https://12factor.net" },
        },
        {
          type: "resource",
          title: "What is Cloud Run?",
          url: "https://cloud.google.com/run/docs/overview/what-is-cloud-run",
          body: "An example of a managed container platform: deploy an image, get HTTPS, automatic scaling and scale-to-zero.",
          source: { type: "resource", name: "Google Cloud", url: "https://cloud.google.com/run/docs/overview/what-is-cloud-run" },
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Your service keeps each user's chat history in a Python dictionary in memory. What breaks when you scale to three instances?",
            [
              "Nothing; each instance shares memory",
              "Requests land on different instances, so history appears and disappears; store it in a database instead",
              "The model's context window shrinks",
              "Docker refuses to start more than one instance",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "observability",
      title: "Observability and cost tracking",
      blocks: [
        {
          type: "ai_text",
          title: "Know what it did, and what it cost",
          body: `You cannot fix what you cannot see. For AI systems, ordinary logs are not enough: you need to see **what the model saw and said** for each request.

**What to record for every model call**
- Model and provider, prompt template version, parameters (temperature, max tokens)
- Input and output token counts, and the **cost** they imply
- Latency: time to first token and total time
- Finish reason, errors and retries
- For RAG: which chunks were retrieved. For agents: each step and tool call.
- The user or tenant, and the request id that ties it all together

**Traces.** A trace is the tree of everything that happened for one request: the API call, the retrieval, three model calls and two tool calls inside it, each with timing. Traces are how you debug "why did the agent do that?" and how you feed error analysis (Module 5). **OpenTelemetry** is the open standard for traces and now has semantic conventions for generative AI, so tools agree on names like \`gen_ai.usage.input_tokens\`. Many LLM observability tools (Langfuse, Phoenix, Braintrust, LangSmith and others) accept or produce this data.

**Dashboards and alerts worth having**
- Requests, errors and latency (p50 and p95) per endpoint and per model
- Tokens and cost per day, per feature and per customer
- Eval pass rate on sampled production traffic
- Alerts on error-rate spikes, latency spikes and cost anomalies (a runaway agent loop shows up here first)

**Privacy.** Prompts and outputs can contain personal data. Decide what you store, mask what you can, restrict who can read traces, and set a retention period.`,
        },
        {
          type: "code",
          title: "tracked_llm.py",
          body: code(
            "python",
            `
import json, logging, os, time, uuid
from openai import OpenAI

log = logging.getLogger("llm")
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])
PRICES = {"openai/gpt-4o-mini": (0.15, 0.60)}  # USD per 1M input / output tokens; keep in config

def chat(messages: list[dict], *, model: str, prompt_version: str, user_id: str, **kwargs):
    started, request_id = time.perf_counter(), str(uuid.uuid4())
    try:
        response = client.chat.completions.create(model=model, messages=messages, **kwargs)
    except Exception as exc:
        log.error(json.dumps({"request_id": request_id, "model": model, "error": repr(exc)}))
        raise
    usage = response.usage
    price_in, price_out = PRICES.get(model, (0, 0))
    log.info(json.dumps({
        "request_id": request_id,
        "user_id": user_id,
        "model": model,
        "prompt_version": prompt_version,
        "input_tokens": usage.prompt_tokens,
        "output_tokens": usage.completion_tokens,
        "cost_usd": round((usage.prompt_tokens * price_in + usage.completion_tokens * price_out) / 1e6, 6),
        "latency_ms": round((time.perf_counter() - started) * 1000),
        "finish_reason": response.choices[0].finish_reason,
    }))
    return response
`,
          ),
        },
        {
          type: "youtube",
          title: "Making GenAI observable with OpenTelemetry",
          url: "https://www.youtube.com/watch?v=RNaa_48LWBY",
          body: "How OpenTelemetry's generative AI conventions capture model calls, token usage and agent steps as standard traces.",
          source: { type: "youtube", name: "Whitney Lee", url: "https://www.youtube.com/watch?v=RNaa_48LWBY" },
        },
        tutorial(
          "THfB4p2xCFY",
          "Trace, evaluate and manage prompts in Langfuse",
          "Langfuse",
          "A full demo of an open-source LLM observability tool: agent traces, cost and latency per call, evals on production traces, experiments and versioned prompts. Exercise: connect it (cloud free tier or self-hosted) to one of your earlier projects and find your slowest and most expensive request.",
        ),
        {
          type: "resource",
          title: "OpenTelemetry: generative AI semantic conventions",
          url: "https://opentelemetry.io/docs/specs/semconv/gen-ai/",
          body: "The standard attribute names for model calls, tokens and agent spans. Use these names in your own logs so any tool can read them.",
          source: { type: "resource", name: "OpenTelemetry", url: "https://opentelemetry.io/docs/specs/semconv/gen-ai/" },
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Which fields are most useful to log for every model call? Pick all that apply.",
            ["Input and output tokens", "Prompt template version", "The user's password", "Latency and finish reason"],
            [0, 1, 3],
          ),
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Trace", "The full tree of operations for one request (API call, retrieval, model calls, tool calls), each with timing and details."),
        },
      ],
    },
  ],
};
