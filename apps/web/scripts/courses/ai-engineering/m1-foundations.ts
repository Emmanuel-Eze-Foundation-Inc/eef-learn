import { card, code, quiz, tutorial, type LessonSpec } from "../../course-spec";

export const m1: LessonSpec = {
  slug: "foundations",
  title: "Foundations: how AI products work",
  blocks: [
    {
      type: "ai_text",
      title: "What this module gives you",
      body: `By the end of this module you can explain what an AI engineer does, describe how a large language model (LLM) turns text into an answer, pick a model for a job on quality, speed and cost, and make your first working API call from code.

You do not need a machine learning background. You need to be comfortable reading a little Python and running commands in a terminal. Everything else is built up from here.

**How the course works.** Each lesson has one idea. You read or watch, then check yourself. Later lessons build on earlier ones, and a few unlock only after you finish the lesson they depend on. The final module is a capstone: you design, build and ship a real AI product.`,
    },
  ],
  lessons: [
    {
      slug: "what-ai-engineering-is",
      title: "What AI engineering is",
      blocks: [
        {
          type: "ai_text",
          title: "The job in one page",
          body: `**AI engineering is building products on top of foundation models.** A machine learning engineer trains models. An AI engineer mostly *uses* models someone else trained (GPT, Claude, Gemini, Llama, Mistral) and turns them into software people rely on.

That changes where the hard work is:

- **Before:** collect data, train a model, then build a product around it. Months before anything works.
- **Now:** call a capable model on day one, then spend your effort on everything around it: the instructions you give it, the data you feed it, the tools it can use, how you check its answers, and how you run it for many users at a sensible cost.

**The AI engineering stack**, from bottom to top:

1. **Models.** Hosted APIs or open-weight models you run yourself.
2. **Context.** Prompts, retrieved documents (RAG), memory, and tool results: everything the model sees.
3. **Orchestration.** Chains, workflows and agents that decide which model calls happen and in what order.
4. **Evaluation.** Tests and measurements that tell you whether the output is good.
5. **Product and operations.** APIs, queues, caching, monitoring, cost control, security, and the interface people use.

Most of this course lives in layers 2 to 5. That is where products succeed or fail.

**What makes it different from ordinary software.** A model is *probabilistic*: the same input can produce different outputs, and it can be confidently wrong. So AI engineering borrows from two traditions: software engineering (APIs, tests, deployment) and data science (sampling, measuring, error analysis). You will use both.

**Automation is part of the job.** Many of the most valuable AI products are not chatbots. They are workflows that read an email, classify it, pull data from a system, draft a reply and route it for approval. Building those reliably is a core skill, and Module 4 covers it.`,
        },
        {
          type: "youtube",
          title: "Software is changing (again)",
          url: "https://www.youtube.com/watch?v=LCEmiRjPEtQ",
          body: "Andrej Karpathy on Software 1.0 (code), 2.0 (trained weights) and 3.0 (prompting LLMs). Watch for his point that LLMs are a new kind of computer you program in English, and for what he calls partial-autonomy apps: products where a human stays in the loop and the AI does the heavy lifting.",
          source: { type: "youtube", name: "Y Combinator", url: "https://www.youtube.com/watch?v=LCEmiRjPEtQ" },
        },
        {
          type: "blog",
          title: "Building LLM applications for production",
          url: "https://huyenchip.com/2023/04/11/llm-engineering.html",
          body: "Chip Huyen's survey of what breaks when an LLM demo becomes a product: ambiguous outputs, cost, latency, and how to compose tasks. A good map of the problems this course solves one by one.",
          source: { type: "blog", name: "Chip Huyen", url: "https://huyenchip.com/2023/04/11/llm-engineering.html" },
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Where does an AI engineer usually spend most of their effort?",
            [
              "Training a new model from scratch",
              "Context, orchestration, evaluation and operations around an existing model",
              "Designing GPU hardware",
              "Writing the model's weights by hand",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "how-llms-work",
      title: "How LLMs work",
      blocks: [
        {
          type: "ai_text",
          title: "Tokens in, tokens out",
          body: `An LLM does one thing: **given a sequence of tokens, it predicts the next token.** Everything else (answering questions, writing code, calling tools) is built from repeating that step.

**Tokens.** Text is split into tokens, chunks that are often a word or part of a word. "Unbelievable" might be three tokens. A rough rule for English: 1 token ≈ 4 characters ≈ ¾ of a word. Tokens matter because you pay per token, and limits are counted in tokens.

**The context window.** The model sees a fixed maximum number of tokens at once: your instructions, the conversation so far, any documents you include, and its own answer. If something is not in the context window, the model does not know it for this request. Windows today range from about 8k to over 1M tokens, but bigger is not free: more tokens cost more, take longer, and very long contexts can make the model miss details in the middle.

**Training, briefly.**
1. *Pretraining:* the model reads a huge amount of text and learns to predict the next token. This is where its knowledge comes from, frozen at a **knowledge cutoff** date.
2. *Fine-tuning and preference training:* it is taught to follow instructions, hold a conversation and refuse harmful requests.

**Sampling.** At each step the model produces a probability for every possible next token. *Temperature* controls how it picks: near 0 it almost always takes the most likely token (repeatable, good for extraction and code); higher values add variety (good for brainstorming). Even at 0, outputs can vary slightly between runs, so never build a system that assumes identical answers.

**Why models make things up.** The model produces *plausible* text, not *verified* text. When it lacks the facts, a plausible guess can look exactly like a correct answer. This is called hallucination, and much of AI engineering (retrieval, tools, evaluation) exists to reduce and catch it.

**What this means for you as a builder:**
- Put the facts the model needs into the context; do not rely on what it memorised.
- Ask for structured output when code will read the answer.
- Measure quality on real examples instead of trusting a few good-looking replies.`,
        },
        {
          type: "youtube",
          title: "Intro to large language models",
          url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
          body: "Andrej Karpathy's one-hour introduction. The first 20 minutes cover what a model file is, pretraining as compressing the internet, and fine-tuning into an assistant. That is the part this lesson needs; the rest on security is a preview of Module 5.",
          source: { type: "youtube", name: "Andrej Karpathy", url: "https://www.youtube.com/watch?v=zjkBMFhNj_g" },
        },
        {
          type: "youtube",
          title: "Go deeper: transformers, visually",
          url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
          optional: true,
          body: "Optional. 3Blue1Brown shows what happens inside the model: embeddings, attention and the final probability distribution over next tokens. Watch it if you want the mechanics behind the summary above.",
          source: { type: "youtube", name: "3Blue1Brown", url: "https://www.youtube.com/watch?v=wjZofJX0v4M" },
        },
        tutorial(
          "zduSFxRajkE",
          "Build a tokenizer",
          "Andrej Karpathy",
          "Code along as Karpathy builds the byte-pair-encoding tokenizer used by GPT models. You'll see exactly why some words cost more tokens than others, why models struggle with spelling and arithmetic, and why non-English text is often more expensive. Watch the first 30 minutes for the core idea; finish it if you enjoy the code.",
          { optional: true },
        ),
        tutorial(
          "kCc8FmEb1nY",
          "Build a GPT from scratch",
          "Andrej Karpathy",
          "Optional deep dive (about 2 hours). You write a small transformer language model in Python and train it on Shakespeare. You don't need this to build products, but after it, terms like attention, context length and sampling stop being abstract.",
          { optional: true },
        ),
        {
          type: "flashcard",
          title: "Recall",
          body: card("Context window", "The maximum number of tokens a model can see in one request: instructions, conversation, documents and its own answer combined."),
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Temperature", "A sampling setting. Low (≈0) picks the most likely next token for repeatable output; higher adds variety."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "A user asks your app about a policy your company changed last week. The model answers confidently with the old policy. What is the most likely cause?",
            [
              "The temperature was set too low",
              "The new policy was not in the context, so the model fell back on its training data",
              "The model's context window is too large",
              "Tokens are counted incorrectly",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "choosing-models",
      title: "Choosing a model: quality, speed, cost",
      blocks: [
        {
          type: "ai_text",
          title: "Three dials and a budget",
          body: `Every model choice trades **quality**, **latency** and **cost**. There is no best model, only the best model *for this task at this volume*.

**Kinds of models**
- **Frontier models** (the largest from OpenAI, Anthropic, Google): best at hard reasoning, long documents and agents. Most expensive and slowest.
- **Small, fast models** (the "mini", "flash", "haiku" tiers, small open models): very cheap and quick. Often good enough for classification, extraction, routing and summaries.
- **Open-weight models** (Llama, Mistral, Qwen, DeepSeek): you can run them yourself or through hosts. Useful for privacy, cost at scale, or fine-tuning.
- **Reasoning models** spend extra "thinking" tokens before answering. Better on multi-step problems, slower and pricier per request.

**Doing the cost maths.** Providers price per million tokens, with input (what you send) cheaper than output (what it writes). Example with made-up but realistic numbers:

- Input: $0.50 per 1M tokens, output: $1.50 per 1M tokens
- One request: 2,000 input tokens + 500 output tokens
- Cost = 2,000 × 0.50/1M + 500 × 1.50/1M = $0.001 + $0.00075 = **$0.00175**
- At 100,000 requests a day: **$175 a day**, about $5,250 a month.

Now swap in a frontier model at 10× the price and the same traffic costs $52,500 a month. This is why model choice is a product decision, not just a technical one.

**Latency.** Users notice two numbers: *time to first token* (how long until text starts appearing) and *total time*. Streaming (Module 2) hides much of the total time. Long prompts, big models and reasoning all add latency.

**A practical way to choose**
1. Start with a strong model to prove the task is possible and to set a quality bar.
2. Build a small set of real test cases (Module 5 shows how).
3. Try cheaper models against those cases. Keep the cheapest one that clears the bar.
4. Revisit when new models ship. Prices drop fast; your evals make switching safe.

**Routers and gateways.** Services like OpenRouter give you one API and one key for hundreds of models, so you can switch or fall back between providers by changing a string. This course's examples use the OpenAI-compatible format that most providers and gateways accept.`,
        },
        {
          type: "resource",
          title: "OpenRouter quickstart",
          url: "https://openrouter.ai/docs/quickstart",
          body: "One API key for many models, with prices listed per model. Use it to compare models in the next lesson without signing up to every provider.",
          source: { type: "resource", name: "OpenRouter", url: "https://openrouter.ai/docs/quickstart" },
        },
        tutorial(
          "VvJvJ0uXiVQ",
          "Compare models through OpenRouter",
          "The Coding Koala",
          "A walkthrough of creating an OpenRouter key, filtering models by price and capability, and calling one from Python. Exercise: send the same three prompts to a small model and a frontier model, then note the price per million tokens, the response time and which answers you'd accept.",
        ),
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Your support-ticket classifier handles 2 million tickets a month and a small model already scores 96% on your test set; a frontier model scores 97% at 15× the cost. What should you do first?",
            [
              "Switch to the frontier model; quality always wins",
              "Keep the small model and look at the 4% it gets wrong to see whether they matter",
              "Fine-tune a new model from scratch",
              "Raise the temperature on the small model",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "first-api-call",
      title: "Your first API call",
      blocks: [
        {
          type: "ai_text",
          title: "From key to answer",
          body: `Time to talk to a model from code. You will use the OpenAI Python SDK, which works with OpenAI and with any OpenAI-compatible endpoint (OpenRouter, many open-model hosts, local servers like Ollama).

**1. Get a key and keep it secret.** Create an API key with your provider. Put it in an environment variable, never in your code or your git history:

\`\`\`bash
export OPENROUTER_API_KEY="sk-or-..."
pip install openai
\`\`\`

**2. Understand the message format.** A request is a list of messages, each with a *role*:
- \`system\`: standing instructions (who the assistant is, rules, output format)
- \`user\`: what the person asked
- \`assistant\`: earlier replies from the model, so it can see the conversation

The API is **stateless**: it remembers nothing between calls. To hold a conversation you send the whole history every time. That is also why long chats get slower and more expensive.

**3. Read the response.** Besides the text, the response tells you how many tokens you used (\`usage\`) and why it stopped (\`finish_reason\`: \`stop\` means it finished; \`length\` means it hit your \`max_tokens\` and the answer is cut off).

**4. Handle failure from day one.** Networks fail, providers rate-limit you (HTTP 429), and requests time out. Set a timeout, and retry a couple of times with a short wait. Module 7 turns this into a proper reliability layer.

Run the example below, then change the system prompt and see how the answer changes.`,
        },
        {
          type: "code",
          title: "hello_llm.py",
          body: code(
            "python",
            `
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
    timeout=30,
    max_retries=2,
)

response = client.chat.completions.create(
    model="openai/gpt-4o-mini",  # any model id from openrouter.ai/models
    temperature=0.2,
    max_tokens=300,
    messages=[
        {"role": "system", "content": "You explain technical ideas to beginners in three short sentences."},
        {"role": "user", "content": "What is an API?"},
    ],
)

choice = response.choices[0]
print(choice.message.content)
print("finish_reason:", choice.finish_reason)
print("tokens:", response.usage.prompt_tokens, "in /", response.usage.completion_tokens, "out")
`,
          ),
        },
        tutorial(
          "TR8GtqwGglw",
          "Call the OpenAI API from Python",
          "Big Stupid Tech",
          "A short setup walkthrough: create a key, install the SDK, and run your first script. The video pastes the key into the code to keep things quick; do what the reading says instead and load it from an environment variable.",
        ),
        {
          type: "flashcard",
          title: "Recall",
          body: card("Why must you resend the conversation on every call?", "Chat APIs are stateless. The model only sees the messages in the current request."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "A response comes back with finish_reason = \"length\". What happened?",
            [
              "The model finished its answer normally",
              "The answer hit max_tokens and was cut off",
              "The request was rate-limited",
              "The system prompt was too long to read",
            ],
            [1],
          ),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Which of these are safe ways to handle your API key? Pick all that apply.",
            [
              "Read it from an environment variable",
              "Store it in a secrets manager in production",
              "Hard-code it in the source file so teammates can run the script",
              "Send it to the browser so the frontend can call the model directly",
            ],
            [0, 1],
          ),
        },
      ],
    },
  ],
};
