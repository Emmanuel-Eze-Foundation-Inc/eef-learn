import { card, code, quiz, tutorial, type LessonSpec } from "../../course-spec";

export const m7: LessonSpec = {
  slug: "scaling",
  title: "Scaling: cost, speed and reliability",
  blocks: [
    {
      type: "ai_text",
      title: "What this module gives you",
      body: `What works for 100 users breaks at 100,000: bills explode, providers rate-limit you, a slow model makes every page slow, and one outage takes everything down.

This module covers the techniques that keep an AI product fast, affordable and up at scale: caching, routing and batching; retries, fallbacks, queues and rate limits; scaling the infrastructure; and choosing between prompting, RAG and fine-tuning when you need more quality.`,
    },
  ],
  lessons: [
    {
      slug: "cost-and-latency",
      title: "Cost and latency at scale",
      blocks: [
        {
          type: "ai_text",
          title: "Spend less, wait less",
          body: `Start by **measuring** (Module 6): cost and latency per feature, per model and per customer. Then apply these, roughly in order of effort.

**1. Trim the context.** Fewer tokens means lower cost and faster responses. Remove duplicated instructions, retrieve fewer but better chunks, summarise old history, shorten tool outputs. Often a 30 to 50% saving with no quality loss.

**2. Cap the output.** Set \`max_tokens\` and ask for concise formats. Output tokens are usually the most expensive and the slowest to generate.

**3. Prompt caching.** Many providers discount input tokens that repeat at the *start* of a prompt (your long system prompt, shared documents). Put stable content first and variable content last to benefit.

**4. Response caching.** If the same question gets the same answer (FAQ lookups, classification of identical text), cache the result keyed on a hash of model + prompt version + input. *Semantic caching* matches similar questions by embedding; it saves more but can return a wrong cached answer, so use a strict similarity threshold and only for low-risk content.

**5. Model routing.** Send each request to the cheapest model that can handle it. A small classifier (or simple rules) sends easy requests to a small model and hard ones to a frontier model. Validate the routing with your evals.

**6. Batching.** For work that is not interactive (nightly summaries, backfills, bulk classification), batch APIs typically cost about half as much in exchange for results within hours.

**7. Parallelise and stream.** Run independent calls concurrently (asyncio), and stream user-facing answers so they *feel* fast.

**8. Self-host at very high volume.** Running an open-weight model on your own GPUs can be cheaper at sustained high throughput, but you take on capacity planning and operations. Do the maths with real traffic first.`,
        },
        {
          type: "code",
          title: "cache_and_route.py",
          body: code(
            "python",
            `
import hashlib, json
import redis
from tracked_llm import chat  # the wrapper from the observability lesson

cache = redis.Redis()
SMALL, LARGE = "openai/gpt-4o-mini", "anthropic/claude-sonnet-4.5"
PROMPT_VERSION = "classify-v3"

def pick_model(text: str) -> str:
    return LARGE if len(text) > 4000 or "contract" in text.lower() else SMALL

def classify(text: str, user_id: str) -> str:
    model = pick_model(text)
    key = "llm:" + hashlib.sha256(json.dumps([model, PROMPT_VERSION, text]).encode()).hexdigest()
    if (hit := cache.get(key)) is not None:
        return hit.decode()
    reply = chat(
        [{"role": "system", "content": "Label the text as one of: billing, bug, sales, other."},
         {"role": "user", "content": text}],
        model=model, prompt_version=PROMPT_VERSION, user_id=user_id, temperature=0, max_tokens=5,
    )
    label = reply.choices[0].message.content.strip()
    cache.set(key, label, ex=60 * 60 * 24)
    return label
`,
          ),
        },
        {
          type: "blog",
          title: "Patterns for building LLM-based systems",
          url: "https://eugeneyan.com/writing/llm-patterns/",
          body: "Eugene Yan's catalogue of production patterns: evals, RAG, fine-tuning, caching, guardrails, defensive UX and collecting feedback. The caching section pairs with this lesson; the rest reviews the whole course.",
          source: { type: "blog", name: "Eugene Yan", url: "https://eugeneyan.com/writing/llm-patterns/" },
        },
        tutorial(
          "NrqvtsnjIHU",
          "Semantic caching with Redis",
          "Nariman Codes",
          "Shows why exact-match caching misses most LLM traffic, then builds a semantic cache that matches questions by meaning. Watch how the similarity threshold trades hit rate against wrong answers, and keep yours strict.",
        ),
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "To get the most from provider prompt caching, where should your long, unchanging system prompt go?",
            ["At the end, after the user's question", "At the very start of the prompt", "In a separate API call", "It doesn't matter"],
            [1],
          ),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "You must re-classify 3 million archived tickets this week. What cuts the cost most with the least work?",
            ["Stream every response", "Use the provider's batch API", "Raise max_tokens", "Use semantic caching"],
            [1],
          ),
        },
      ],
    },
    {
      slug: "reliability",
      title: "Reliability: retries, fallbacks, queues",
      blocks: [
        {
          type: "ai_text",
          title: "Design for the bad day",
          body: `Model APIs fail more often than ordinary APIs: rate limits (HTTP 429), overloaded servers (529/503), timeouts, and occasional malformed output. At scale, "rare" means "every minute". Build these in.

**Timeouts.** Every call gets one. A hung request holds a worker and a user hostage.

**Retries with exponential backoff and jitter.** Retry only errors that may succeed later (429, 5xx, timeouts), not bad requests (400) or auth failures (401). Wait longer each time (0.5s, 1s, 2s, 4s) plus a random jitter so thousands of clients don't retry in lockstep. Respect the \`Retry-After\` header when present. Cap the attempts.

**Fallbacks.** If the primary model is down or too slow, fall back to another provider or model with similar quality. Test the fallback path with your evals; a fallback that produces broken output is worse than an error message.

**Circuit breakers.** If a provider is failing most requests, stop calling it for a short period instead of piling on retries; route to the fallback and probe occasionally.

**Rate limits, both directions.** Providers limit you, so track your usage against their limits and smooth bursts. *You* must limit your users too: per-user and per-tenant quotas on requests and tokens stop one customer (or one attacker) from spending your whole budget.

**Queues for heavy work.** Put long or bursty jobs (ingestion, agent tasks, bulk generation) on a queue. Workers pull at a controlled rate, so a spike becomes a backlog instead of an outage. Make jobs **idempotent** and give each a retry limit and a dead-letter queue.

**Graceful degradation.** Decide what users see when the AI is unavailable: a cached answer, a simpler non-AI path, or a clear "try again shortly". Never a spinner that runs forever.`,
        },
        {
          type: "code",
          title: "resilient_call.py",
          body: code(
            "python",
            `
import random, time
from openai import APIConnectionError, APIStatusError, APITimeoutError, OpenAI

PROVIDERS = [  # primary first; same OpenAI-compatible interface
    ("openai/gpt-4o-mini", OpenAI(base_url="https://openrouter.ai/api/v1", timeout=20, max_retries=0)),
    ("google/gemini-2.5-flash", OpenAI(base_url="https://openrouter.ai/api/v1", timeout=20, max_retries=0)),
]
RETRYABLE = {408, 409, 429, 500, 502, 503, 504, 529}

def complete(messages: list[dict], attempts_per_provider: int = 3) -> str:
    last_error: Exception | None = None
    for model, client in PROVIDERS:
        for attempt in range(attempts_per_provider):
            try:
                reply = client.chat.completions.create(model=model, messages=messages)
                return reply.choices[0].message.content
            except (APITimeoutError, APIConnectionError) as exc:
                last_error = exc
            except APIStatusError as exc:
                if exc.status_code not in RETRYABLE:
                    raise  # bad request or auth: retrying will not help
                last_error = exc
            time.sleep(min(8, 0.5 * 2**attempt) + random.uniform(0, 0.3))
    raise RuntimeError("All providers failed") from last_error
`,
          ),
        },
        {
          type: "resource",
          title: "Google SRE book: handling overload",
          url: "https://sre.google/sre-book/handling-overload/",
          body: "How Google keeps services up under too much load: per-client limits, criticality, and retry budgets. The principles apply directly to AI services.",
          source: { type: "resource", name: "Google SRE", url: "https://sre.google/sre-book/handling-overload/" },
        },
        {
          type: "resource",
          title: "Python asyncio",
          url: "https://docs.python.org/3/library/asyncio.html",
          body: "The standard library for concurrent I/O in Python, used to run many model calls in parallel and to build async workers.",
          source: { type: "resource", name: "Python docs", url: "https://docs.python.org/3/library/asyncio.html" },
        },
        tutorial(
          "Qb9s3UiMSTA",
          "Asyncio in Python",
          "Tech With Tim",
          "The event loop, coroutines, tasks and synchronisation, coded step by step. Exercise: use asyncio.gather and AsyncOpenAI to classify 50 texts concurrently, with a semaphore so you never have more than 5 requests in flight.",
        ),
        {
          type: "flashcard",
          title: "Recall",
          body: card("Why add jitter to backoff?", "So many clients that failed at the same moment don't all retry at the same moment and overload the service again."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Which errors should your client retry automatically? Pick all that apply.",
            ["429 Too Many Requests", "401 Unauthorized", "503 Service Unavailable", "A request timeout"],
            [0, 2, 3],
          ),
        },
      ],
    },
    {
      slug: "scaling-infrastructure",
      title: "Scaling the infrastructure",
      blocks: [
        {
          type: "ai_text",
          title: "More users, same experience",
          body: `**Scale the stateless parts horizontally.** Because your API servers keep no state (Module 6), you add capacity by running more copies behind a load balancer. Managed platforms do this automatically based on concurrency or CPU. AI requests are mostly *waiting on the model*, so use async servers and scale on concurrent requests rather than CPU.

**Separate the workloads.**
- **Interactive API:** low latency, autoscaled on traffic.
- **Workers:** pull from queues, scaled on queue depth. Ingestion spikes don't slow down chat.
- **Scheduled jobs:** batch processing at off-peak times.

**The database is usually the first real bottleneck.** Use connection pooling (serverless platforms can open thousands of connections), add indexes for your common queries, and use HNSW indexes for vector search. Read replicas help read-heavy loads. A single well-tuned Postgres serves a surprising amount of traffic.

**Multi-tenancy.** If you serve many organisations, isolate their data in every query (including retrieval filters), track usage per tenant, and enforce per-tenant quotas so one large customer cannot starve the rest.

**When Kubernetes makes sense.** Once you run many services, need fine control over scaling and networking, or host your own models on GPUs, an orchestrator like Kubernetes pays off. It also brings real operational cost. Many successful AI products run for years on managed containers.

**Self-hosted models.** Serving open models efficiently means GPU instances, an inference server (vLLM, TGI, or similar) that batches requests, and autoscaling that accounts for slow cold starts. Treat it as its own project with its own evals and cost model.

**Load test before launch.** Simulate expected peak traffic against staging with a mocked or rate-limited model, and find the bottleneck before your users do.`,
        },
        {
          type: "youtube",
          title: "Kubernetes in 100 seconds",
          url: "https://www.youtube.com/watch?v=PziYflu8cB8",
          body: "A fast overview of what Kubernetes does (clusters, pods, scaling) so you can judge when it is worth adopting.",
          source: { type: "youtube", name: "Fireship", url: "https://www.youtube.com/watch?v=PziYflu8cB8" },
        },
        tutorial(
          "X48VuDVv0do",
          "Kubernetes, the full course",
          "TechWorld with Nana",
          "Pods, deployments, services, config, secrets and scaling, built hands-on with a local cluster. Watch this when your product actually needs an orchestrator; until then, the concepts still help you understand how managed platforms scale your containers.",
          { optional: true },
        ),
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Your API servers mostly wait on model responses and CPU sits at 10%, yet users see slow responses under load. What should autoscaling be based on?",
            ["CPU usage", "Concurrent requests per instance", "Disk space", "Time of day only"],
            [1],
          ),
        },
      ],
    },
    {
      slug: "prompt-rag-or-finetune",
      title: "Prompt, RAG or fine-tune?",
      blocks: [
        {
          type: "ai_text",
          title: "Choosing how to improve quality",
          body: `When the model isn't good enough, you have three main levers. They solve different problems.

**Prompt engineering** changes *how you ask*. Cheapest and fastest to iterate. Fixes unclear instructions, wrong format, tone, and many reasoning slips. Always try it first.

**RAG** changes *what the model knows right now*. Use it when answers depend on specific, private or frequently changing information: your docs, products, policies. It also gives you citations and lets you update knowledge without retraining.

**Fine-tuning** changes *the model itself* by training it further on your examples. Use it for:
- a consistent style, format or behaviour that prompts can't reliably produce
- narrow, high-volume tasks where a small fine-tuned model can match a large general one at a fraction of the cost and latency
- teaching a specialised skill or vocabulary

Fine-tuning is **not** a good way to add facts that change: they go stale, can't be cited, and the model may still blend them up. It also needs hundreds to thousands of high-quality examples, an eval suite to prove it helped, and retraining when base models improve.

**A practical order**
1. Prompt well, with examples. Measure.
2. Add retrieval if knowledge is the gap. Measure.
3. Fine-tune only if a specific, measured gap remains, or to cut cost at scale once quality is proven.

The techniques combine: many strong systems use a fine-tuned small model *with* RAG *and* a careful prompt. Your eval suite is what tells you each step was worth it.`,
        },
        {
          type: "youtube",
          title: "RAG vs fine-tuning vs prompt engineering",
          url: "https://www.youtube.com/watch?v=zYGDpG-pTho",
          body: "IBM Technology compares the three approaches with the same running example, including cost and when to combine them.",
          source: { type: "youtube", name: "IBM Technology", url: "https://www.youtube.com/watch?v=zYGDpG-pTho" },
        },
        tutorial(
          "XFXanH1-Uds",
          "Fine-tune an open model on a free GPU",
          "Shane | LLM Implementation",
          "A complete fine-tuning run with Unsloth and LoRA on a free Colab GPU: load a 4-bit model, attach adapters, prepare the dataset, train and test, including fixes for the common errors. Before trying it on your own data, write the eval you'll use to decide whether it helped.",
        ),
        {
          type: "blog",
          title: "RAG vs fine-tuning vs prompt engineering",
          url: "https://www.ibm.com/think/topics/rag-vs-fine-tuning-vs-prompt-engineering",
          body: "The written companion to the video, useful as a reference when you need to justify a choice to your team.",
          source: { type: "blog", name: "IBM", url: "https://www.ibm.com/think/topics/rag-vs-fine-tuning-vs-prompt-engineering" },
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Best lever for knowledge that changes weekly", "RAG: retrieve the current information at question time, with citations."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "A model must always answer in your company's strict, unusual report format, and good prompting with examples still fails 15% of the time on 1M reports a month. What is a reasonable next step?",
            [
              "Add RAG over the format guide",
              "Fine-tune a smaller model on a few thousand correct reports, and confirm with evals",
              "Raise the temperature",
              "Give up on structured reports",
            ],
            [1],
          ),
        },
      ],
    },
  ],
};
