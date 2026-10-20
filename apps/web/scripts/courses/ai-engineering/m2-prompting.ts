import { card, code, quiz, tutorial, type LessonSpec } from "../../course-spec";

export const m2: LessonSpec = {
  slug: "prompting-and-structure",
  title: "Prompting, structure and tools",
  blocks: [
    {
      type: "ai_text",
      title: "What this module gives you",
      body: `A model that writes nice paragraphs is a demo. A model whose output your code can trust is a product. This module closes that gap.

You will learn to write prompts that hold up across thousands of inputs, get **structured output** your program can parse, let the model **call your functions** (tool calling), stream answers so the app feels fast, and manage what goes into the context window. Tool calling is the foundation for the agents in Module 4.`,
    },
  ],
  lessons: [
    {
      slug: "prompts-that-hold-up",
      title: "Prompts that hold up",
      blocks: [
        {
          type: "ai_text",
          title: "Write prompts like specifications",
          body: `A good prompt reads like a brief you would give a capable new colleague who knows nothing about your project. The model cannot ask clarifying questions, so the prompt has to answer them in advance.

**The parts of a production prompt**
1. **Role and goal.** "You are a support assistant for Acme's billing team. Your goal is to resolve the customer's question or hand it to a human."
2. **Context.** The facts it needs: the customer's plan, the relevant policy, retrieved documents. Mark them clearly, for example inside \`<policy>...</policy>\` tags, so the model knows what is data and what is instruction.
3. **Rules.** What to do and not do, stated plainly. Explain *why* when it is not obvious; models follow reasons better than bare commands.
4. **Output format.** Exactly what shape the answer must take.
5. **Examples (few-shot).** Two to five input/output pairs showing the hard cases. Examples are often the single most effective addition to a prompt.

**Techniques that consistently help**
- **Be specific.** "Summarise in 3 bullet points under 15 words each, for a CFO" beats "summarise this".
- **Let it think first** on multi-step problems: ask for reasoning before the final answer, or use a reasoning model. Put the reasoning somewhere your code can strip out.
- **Put long documents first and the question last.** Models tend to follow the instruction nearest the end.
- **Give it a way out.** "If the policy does not cover this, say so and do not guess." This alone cuts many hallucinations.
- **Split big tasks.** One prompt that extracts, then another that writes, is usually more reliable than one prompt doing both.

**Treat prompts as code.** Keep them in version control, give them names, and change them only with a test run (Module 5). A one-word edit can fix ten cases and break three others; you only find out if you measure.

**Anti-patterns:** shouting in capitals instead of explaining, contradictory rules piled up over time, examples that all look the same (the model copies their quirks), and asking for something you never describe.`,
        },
        {
          type: "youtube",
          title: "Prompt engineering overview",
          url: "https://www.youtube.com/watch?v=dOxUroR57xs",
          body: "Elvis Saravia, author of the Prompt Engineering Guide, walks through the core techniques: zero- and few-shot prompting, chain-of-thought, and how to structure instructions. Watch for the examples of how small wording changes shift results.",
          source: { type: "youtube", name: "Elvis Saravia", url: "https://www.youtube.com/watch?v=dOxUroR57xs" },
        },
        tutorial(
          "ysPbXH0LpIE",
          "Build a production prompt step by step",
          "Anthropic",
          "Anthropic's applied AI team starts from a one-line prompt that gets a real insurance-claim task wrong, then fixes it piece by piece: task context, background detail, examples, reminders and output format. Pause after each step and predict what the change will fix. It is the reading above, done live.",
        ),
        {
          type: "blog",
          title: "Anthropic: prompt engineering overview",
          url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview",
          body: "A practical, ordered list of techniques from a model provider: be clear and direct, use examples, let the model think, use XML tags, chain prompts. Keep it open while you write your first real prompts.",
          source: { type: "blog", name: "Anthropic", url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview" },
        },
        {
          type: "resource",
          title: "Prompt Engineering Guide",
          url: "https://www.promptingguide.ai",
          body: "A reference of prompting techniques with examples, from basic to advanced. Use it to look things up rather than read end to end.",
          source: { type: "resource", name: "DAIR.AI", url: "https://www.promptingguide.ai" },
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Your summariser sometimes invents figures that are not in the source document. Which prompt change is most likely to help?",
            [
              "Add \"BE ACCURATE!!!\" in capitals",
              "Tell it to use only figures from the document, and to say \"not stated\" when a figure is missing",
              "Raise the temperature",
              "Remove the document so the prompt is shorter",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "structured-output",
      title: "Structured output",
      blocks: [
        {
          type: "ai_text",
          title: "Make the model return data, not prose",
          body: `When code reads the model's answer, you want **JSON that matches a schema**, every time. Parsing free text with regular expressions breaks the first time the model phrases something differently.

**Three levels of strictness**
1. **Ask nicely.** "Reply with JSON like {...}". Works most of the time, which is not good enough for production.
2. **JSON mode.** The provider guarantees syntactically valid JSON, but not that it has your fields.
3. **Structured outputs / schema-constrained decoding.** You pass a JSON Schema and the provider constrains generation so the output *must* match it. Use this whenever your provider supports it.

**Define the schema in code.** In Python, a Pydantic model gives you the schema, validation and a typed object in one place. In TypeScript, Zod plays the same role.

**Design schemas for the model, not just for your database**
- Use clear field names and add a \`description\` to each field; the model reads them.
- Prefer \`enum\` values for categories (\`"refund" | "bug" | "other"\`) so the answer is always one you handle.
- Allow an explicit "unknown" or \`null\` instead of forcing a guess.
- Put a short \`reasoning\` field *before* the answer fields when the task needs thought; the model fills fields in order.

**Always validate anyway.** Even with constrained decoding, check the result: values can be in range but wrong. If validation fails, retry once with the error message included, then fall back (route to a human, or return a safe default). Never let an unvalidated model output write to your database.

**Common uses:** extracting fields from invoices or emails, classifying tickets, turning a request into search filters, and generating content your UI renders (this course's own quizzes are stored as JSON with a fixed shape).`,
        },
        {
          type: "code",
          title: "extract_ticket.py",
          body: code(
            "python",
            `
import os
from typing import Literal
from openai import OpenAI
from pydantic import BaseModel, Field

class Ticket(BaseModel):
    reasoning: str = Field(description="One sentence on why you chose the category")
    category: Literal["billing", "bug", "feature_request", "other"]
    urgency: Literal["low", "medium", "high"]
    customer_email: str | None = Field(description="Email address if present, else null")

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

completion = client.beta.chat.completions.parse(
    model="openai/gpt-4o-mini",
    messages=[
        {"role": "system", "content": "Classify the support message. Use 'other' when unsure."},
        {"role": "user", "content": "I was charged twice this month!! fix it asap - dana@example.com"},
    ],
    response_format=Ticket,
)

ticket = completion.choices[0].message.parsed  # a validated Ticket, or None if the model refused
print(ticket)
`,
          ),
        },
        {
          type: "blog",
          title: "OpenAI: structured outputs guide",
          url: "https://platform.openai.com/docs/guides/structured-outputs",
          body: "How schema-constrained output works, which schema features are supported, and how refusals are reported. The same ideas apply to other providers' equivalents.",
          source: { type: "blog", name: "OpenAI", url: "https://platform.openai.com/docs/guides/structured-outputs" },
        },
        tutorial(
          "gsJxuvdSa68",
          "Structured outputs four ways",
          "Techfluencer's Quest",
          "One messy customer review, extracted four ways: plain prompting, JSON mode, Pydantic structured outputs and tool calling. You see where each one breaks. Code along, then add a field of your own (for example a sentiment enum) and make the model fill it.",
        ),
        {
          type: "flashcard",
          title: "Recall",
          body: card("JSON mode vs structured outputs", "JSON mode guarantees valid JSON. Structured outputs guarantee JSON that matches your schema."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Which practices make structured extraction more reliable? Pick all that apply.",
            [
              "Use enums for categories",
              "Allow null for fields that may be missing",
              "Skip validation because the provider enforces the schema",
              "Add descriptions to schema fields",
            ],
            [0, 1, 3],
          ),
        },
      ],
    },
    {
      slug: "tool-calling",
      title: "Tool calling",
      blocks: [
        {
          type: "ai_text",
          title: "Let the model ask your code for help",
          body: `**Tool calling** (also called function calling) lets the model say "I need to run \`get_order_status\` with \`order_id=1042\`" instead of guessing. Your code runs the function and sends the result back, and the model uses it to answer.

**The round trip**
1. You send the conversation **plus a list of tools**, each with a name, a description and a JSON Schema for its arguments.
2. The model either answers normally or returns one or more **tool calls**.
3. Your code executes each call (the model never runs anything itself), then appends the results as \`tool\` messages.
4. You call the model again. It reads the results and either answers or asks for more tools.

**Why this matters:** tools give the model live data (your database, the weather, a search engine) and the ability to act (send an email, create a ticket). It is how you get past the knowledge cutoff and how agents work.

**Writing good tools**
- **Descriptions are prompts.** Say what the tool does, when to use it, and what it returns. Vague descriptions cause wrong calls.
- **Few, clear tools beat many overlapping ones.** If two tools sound alike, the model will mix them up.
- **Return useful, compact results.** Not a 5,000-row dump; the fields the model needs, plus a clear error message on failure so it can recover.
- **Validate arguments** like any untrusted input. The model can pass a wrong ID or a malicious string.
- **Guard side effects.** Reading is low risk. Writing, paying, deleting or emailing should need confirmation or limits (Module 5 covers why).

Below is the minimal loop. In Module 4 you will grow it into a full agent.`,
        },
        {
          type: "youtube",
          title: "What is tool calling?",
          url: "https://www.youtube.com/watch?v=h8gMhXYAv1k",
          body: "IBM Technology explains the request → tool call → result → answer cycle with diagrams. Watch for the point that the application, not the model, executes the tool.",
          source: { type: "youtube", name: "IBM Technology", url: "https://www.youtube.com/watch?v=h8gMhXYAv1k" },
        },
        tutorial(
          "aqdWSYWC_LI",
          "Function calling from scratch",
          "Dave Ebbelaar",
          "A beginner code-along: define a tool schema, let the model request it, run the function yourself and send the result back. Exercise: add a second tool and check that the model picks the right one for different questions.",
        ),
        {
          type: "code",
          title: "tool_call.py",
          body: code(
            "python",
            `
import json, os
from openai import OpenAI

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])
MODEL = "openai/gpt-4o-mini"

def get_order_status(order_id: str) -> dict:
    orders = {"1042": {"status": "shipped", "eta": "2026-10-22"}}
    return orders.get(order_id, {"error": f"No order {order_id}"})

TOOLS = [{
    "type": "function",
    "function": {
        "name": "get_order_status",
        "description": "Look up the shipping status of one order by its numeric id.",
        "parameters": {
            "type": "object",
            "properties": {"order_id": {"type": "string", "description": "e.g. '1042'"}},
            "required": ["order_id"],
        },
    },
}]

messages = [{"role": "user", "content": "Where is my order 1042?"}]
reply = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS).choices[0].message

if reply.tool_calls:
    messages.append(reply)
    for call in reply.tool_calls:
        args = json.loads(call.function.arguments)
        result = get_order_status(**args)
        messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)})
    reply = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS).choices[0].message

print(reply.content)
`,
          ),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "In tool calling, who actually executes the function?",
            ["The model provider's servers", "Your application code", "The user's browser", "The model, inside its context window"],
            [1],
          ),
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Three parts of a tool definition", "A name, a description (when and why to use it), and a JSON Schema for its arguments."),
        },
      ],
    },
    {
      slug: "streaming-and-context",
      title: "Streaming and context engineering",
      blocks: [
        {
          type: "ai_text",
          title: "Feel fast, stay focused",
          body: `**Streaming.** A long answer can take 10 to 20 seconds to generate. With \`stream=True\`, the API sends tokens as they are produced, so the user sees text within a second. In a web app you forward the stream to the browser with Server-Sent Events or a streaming HTTP response. Two things to remember: you only know the final token count and \`finish_reason\` at the end of the stream, and if you need structured output, validate after the stream completes (or stream a separate human-readable part).

**Context engineering** is the discipline of deciding *exactly what tokens the model sees* on each call. Prompts are one part. The rest:

- **Conversation history.** Long chats grow without limit. Keep recent turns verbatim and summarise or drop older ones.
- **Retrieved knowledge.** Only the few passages that matter (Module 3), not the whole document library.
- **Tool results.** Trim them. A tool that returns 20,000 tokens of JSON crowds out everything else.
- **Memory.** Durable facts about the user or task, stored outside the model and loaded when relevant.

**Why less is often more.** Every token costs money and time, and models can lose track of details buried in very long contexts. A focused 3,000-token context often beats a sprawling 100,000-token one on quality *and* cost.

**A useful habit:** log the full context of a few real requests and read them. You will usually find duplicated instructions, stale history and irrelevant documents you can cut.`,
        },
        {
          type: "code",
          title: "stream.py",
          body: code(
            "python",
            `
import os
from openai import OpenAI

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])

stream = client.chat.completions.create(
    model="openai/gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain caching to a new developer."}],
    stream=True,
)
for chunk in stream:
    delta = chunk.choices[0].delta.content if chunk.choices else None
    if delta:
        print(delta, end="", flush=True)
print()
`,
          ),
        },
        tutorial(
          "hOAAg1WaZh8",
          "Stream from FastAPI to a React UI",
          "Techno Pain",
          "Build both ends of a stream: a FastAPI endpoint that sends Server-Sent Events and a React page that renders text as it arrives. Swap the demo generator for the streaming model call above and you have a real streaming chat.",
        ),
        {
          type: "blog",
          title: "Effective context engineering for AI agents",
          url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents",
          body: "Anthropic's engineering team on treating context as a scarce resource: compaction, note-taking, and loading information just in time. It bridges this lesson and the agents in Module 4.",
          source: { type: "blog", name: "Anthropic", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" },
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "A chat assistant gets slower and more expensive the longer a conversation runs. What is the best fix?",
            [
              "Switch to a model with a bigger context window",
              "Keep recent turns, summarise older ones, and trim large tool results",
              "Turn off streaming",
              "Send only the latest user message",
            ],
            [1],
          ),
        },
      ],
    },
  ],
};
