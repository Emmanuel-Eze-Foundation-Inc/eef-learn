import { card, code, quiz, tutorial, type LessonSpec } from "../../course-spec";

export const m4: LessonSpec = {
  slug: "agents-and-automation",
  title: "Agents and automation",
  blocks: [
    {
      type: "ai_text",
      title: "What this module gives you",
      body: `This module is about AI that **does work**, not just answers questions. You will learn when to use a fixed workflow and when an agent is worth it, build an agent loop with limits, connect tools through the Model Context Protocol (MCP), and automate real business processes with a human in the loop.

The theme throughout: start with the simplest thing that works. Most valuable automation is a well-designed workflow with one or two model calls, not an autonomous agent.`,
    },
  ],
  lessons: [
    {
      slug: "workflows-vs-agents",
      title: "Workflows vs agents",
      blocks: [
        {
          type: "ai_text",
          title: "Who decides the next step?",
          body: `The key question is **who decides what happens next: your code or the model?**

**Workflows: your code decides.** The steps are fixed; the model fills in some of them. Common patterns:
- **Prompt chaining:** step 1 extracts, step 2 drafts, step 3 checks. Each step is simple and testable.
- **Routing:** a cheap model classifies the input, then your code sends it down the right path (refund flow, bug flow, sales flow).
- **Parallelisation:** run several calls at once, for example checking a draft for tone, accuracy and policy simultaneously, then combine.
- **Orchestrator–workers:** one call plans subtasks, workers do them, your code merges.
- **Evaluator–optimiser:** one call writes, another critiques, loop until it passes or a limit is hit.

**Agents: the model decides.** You give the model a goal and tools, and it chooses which tool to call, reads the result, and decides again, until it judges the goal done. Agents handle open-ended tasks where you cannot predict the steps (research, debugging, multi-system support cases).

**The trade-off**

| | Workflow | Agent |
|---|---|---|
| Predictability | High | Lower |
| Cost and latency | Known | Variable, often higher |
| Testing | Step by step | End to end, harder |
| Handles surprises | Poorly | Well |

**Rule of thumb:** if you can draw the flowchart, build a workflow. Reach for an agent only when the path genuinely depends on what the model discovers along the way, and when mistakes are cheap to catch and undo.`,
        },
        {
          type: "blog",
          title: "Building effective agents",
          url: "https://www.anthropic.com/engineering/building-effective-agents",
          body: "The clearest guide to these patterns, from Anthropic's work with dozens of teams. Its core advice: find the simplest solution, and add agentic complexity only when it demonstrably improves results.",
          source: { type: "blog", name: "Anthropic", url: "https://www.anthropic.com/engineering/building-effective-agents" },
        },
        {
          type: "youtube",
          title: "How we build effective agents",
          url: "https://www.youtube.com/watch?v=D7_ipDqhtwk",
          body: "Barry Zhang (Anthropic) at the AI Engineer summit: don't build agents for everything, keep them simple, and think like your agent by looking at exactly what it sees.",
          source: { type: "youtube", name: "AI Engineer", url: "https://www.youtube.com/watch?v=D7_ipDqhtwk" },
        },
        tutorial(
          "bZzyPscbtI8",
          "Workflow patterns in pure Python",
          "Dave Ebbelaar",
          "Code the building blocks from Anthropic's guide without a framework: structured output, tools, retrieval, then prompt chaining, routing and parallelisation. Exercise: rebuild the invoice example from the quiz below as a routing workflow.",
        ),
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Every invoice email must be parsed, checked against the purchase order, and either approved or flagged. Which design fits best?",
            [
              "An autonomous agent with access to every company system",
              "A workflow: extract fields, compare in code, route to approve or flag",
              "A single prompt asking the model to \"handle invoices\"",
              "Fine-tuning a model on invoices",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "agent-loop",
      title: "The agent loop",
      blocks: [
        {
          type: "ai_text",
          title: "Think, act, observe, repeat",
          body: `An agent is a loop around the tool calling you built in Module 2:

1. Send the goal, history and tools to the model.
2. If it returns tool calls, run them and append the results.
3. If it returns a final answer, stop.
4. Otherwise go back to step 1.

That is genuinely all an agent is. The engineering is in making the loop **safe, bounded and debuggable**.

**Limits every agent needs**
- **Maximum steps** (for example 10 to 25), so a confused agent cannot loop forever.
- **A budget** in tokens or dollars per task.
- **Timeouts** per tool call and for the whole task.
- **Stop conditions** it can trigger itself, such as a \`finish\` tool with the final result.

**Planning and memory.** For longer tasks, ask the agent to write a short plan first and update it as it goes. Keep a scratchpad or notes file outside the context window, and summarise old steps when the history gets long (the context engineering ideas from Module 2).

**Tools shape behaviour more than prompts do.** An agent with a clear \`search_orders(customer_email)\` tool behaves far better than one with a generic \`run_sql(query)\`. Design tools around the tasks, give them helpful error messages ("No order with id 1042; ids are 4 digits"), and keep their outputs small.

**Debugging agents.** Log every step: the model's message, each tool call with arguments, each result, tokens and time. When an agent fails, replay the log and read it as if you were the model. The failure is usually obvious: a missing fact, a confusing tool description, or a result too big to use.

**Frameworks** (LangGraph, the OpenAI Agents SDK, Pydantic AI and others) give you this loop with persistence, streaming and human-approval steps built in. Learn the raw loop first so you understand what they do.`,
        },
        {
          type: "code",
          title: "agent.py",
          body: code(
            "python",
            `
import json, os
from openai import OpenAI

client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])
MODEL, MAX_STEPS = "openai/gpt-4o-mini", 10

def run_agent(goal: str, tools: list[dict], handlers: dict) -> str:
    messages = [
        {"role": "system", "content": "Work step by step. Use tools for facts. Answer when you are done."},
        {"role": "user", "content": goal},
    ]
    for step in range(MAX_STEPS):
        reply = client.chat.completions.create(model=MODEL, messages=messages, tools=tools).choices[0].message
        messages.append(reply)
        if not reply.tool_calls:
            return reply.content
        for call in reply.tool_calls:
            handler = handlers.get(call.function.name)
            try:
                result = handler(**json.loads(call.function.arguments)) if handler else {"error": "unknown tool"}
            except Exception as exc:  # report errors to the model so it can recover
                result = {"error": str(exc)}
            print(f"step {step}: {call.function.name}({call.function.arguments}) -> {str(result)[:80]}")
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)[:4000]})
    return "Stopped: step limit reached before the task was finished."
`,
          ),
        },
        {
          type: "youtube",
          title: "What are AI agents?",
          url: "https://www.youtube.com/watch?v=F8NKVhkZZWI",
          body: "IBM Technology on compound AI systems and agents: reasoning, acting and memory. Watch for the distinction between programmatic control logic and model-driven control logic, which is the workflow-vs-agent idea from the last lesson.",
          source: { type: "youtube", name: "IBM Technology", url: "https://www.youtube.com/watch?v=F8NKVhkZZWI" },
        },
        tutorial(
          "c9AnqCeyxbI",
          "Build an agent in pure Python",
          "Tech With Tim",
          "Model, tools and a loop, coded step by step into a small coding assistant that reads and edits files. Compare his loop with agent.py above, then add a step limit and a cost budget to his version.",
        ),
        {
          type: "blog",
          title: "LLM powered autonomous agents",
          url: "https://lilianweng.github.io/posts/2023-06-23-agent/",
          body: "Lilian Weng's detailed overview of agent components: planning, memory and tool use, with the research behind each. Read it when you want depth beyond the loop.",
          source: { type: "blog", name: "Lilian Weng", url: "https://lilianweng.github.io/posts/2023-06-23-agent/" },
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "Which safeguards should every production agent loop have? Pick all that apply.",
            ["A maximum number of steps", "A token or cost budget", "Unlimited retries so it never gives up", "Logs of every tool call and result"],
            [0, 1, 3],
          ),
        },
      ],
    },
    {
      slug: "mcp",
      title: "The Model Context Protocol",
      blocks: [
        {
          type: "ai_text",
          title: "One standard plug for tools",
          body: `Every AI app used to wire up tools its own way, so a GitHub integration written for one assistant had to be rewritten for the next. The **Model Context Protocol (MCP)** is an open standard that fixes this: write a tool server once, and any MCP-capable client (Claude, ChatGPT, Cursor, your own agent) can use it.

**The pieces**
- **Host:** the AI application the user works in.
- **Client:** the part of the host that speaks MCP to one server.
- **Server:** a program that exposes capabilities. It can run locally (over stdio) or remotely (over HTTP).

**What a server exposes**
- **Tools:** functions the model can call, like \`create_issue\` or \`query_database\`.
- **Resources:** read-only data the app can load into context, like files or records.
- **Prompts:** reusable prompt templates the user can pick.

**When to build an MCP server.** When you want *other* AI tools to use your product's data or actions: for example, letting a customer's assistant search your knowledge base or create orders. When the tools are only for your own internal agent, plain tool calling is simpler.

**Security matters more here.** An MCP server is a doorway into your systems for a model that can be manipulated (Module 5). Authenticate every request (remote servers use OAuth), scope permissions to the user, validate every argument, and require confirmation for destructive actions. Only install third-party MCP servers you trust: a server's tool descriptions go straight into the model's context.`,
        },
        {
          type: "youtube",
          title: "The Model Context Protocol, from its creators",
          url: "https://www.youtube.com/watch?v=CQywdSdi5iA",
          body: "Anthropic's team explains why they created MCP, how hosts, clients and servers fit together, and where the protocol is going.",
          source: { type: "youtube", name: "Anthropic", url: "https://www.youtube.com/watch?v=CQywdSdi5iA" },
        },
        tutorial(
          "raHW_gklmDw",
          "Build an MCP server with FastMCP",
          "Eric Roby",
          "Wrap an existing notes app in an MCP server with typed tools and docstrings, add logging, and connect it to Claude Desktop. Do the same with notes_server.py below, then test it in the MCP Inspector before connecting a client.",
        ),
        {
          type: "code",
          title: "notes_server.py (MCP server)",
          body: code(
            "python",
            `
# pip install "mcp[cli]"   then:  mcp dev notes_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("notes")
NOTES: dict[str, str] = {}

@mcp.tool()
def add_note(title: str, body: str) -> str:
    """Save a note under a short title. Overwrites a note with the same title."""
    NOTES[title] = body
    return f"Saved '{title}'."

@mcp.tool()
def search_notes(query: str) -> list[str]:
    """Return titles of notes whose title or body contains the query (case-insensitive)."""
    q = query.lower()
    return [t for t, b in NOTES.items() if q in t.lower() or q in b.lower()]

@mcp.resource("notes://{title}")
def read_note(title: str) -> str:
    """The full text of one note."""
    return NOTES.get(title, "No such note.")

if __name__ == "__main__":
    mcp.run()
`,
          ),
        },
        {
          type: "resource",
          title: "MCP documentation",
          url: "https://modelcontextprotocol.io/introduction",
          body: "The official introduction, specification and SDKs for Python, TypeScript and more.",
          source: { type: "resource", name: "Model Context Protocol", url: "https://modelcontextprotocol.io/introduction" },
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Three things an MCP server can expose", "Tools (actions the model calls), resources (data to read), and prompts (reusable templates)."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "What problem does MCP mainly solve?",
            [
              "It makes models smarter at reasoning",
              "It gives one standard way to connect tools and data to any AI application",
              "It replaces the need for API keys",
              "It trains models on your company data",
            ],
            [1],
          ),
        },
      ],
    },
    {
      slug: "automation",
      title: "Automating business processes",
      blocks: [
        {
          type: "ai_text",
          title: "From manual task to reliable automation",
          body: `Some of the fastest returns from AI come from automating the repetitive work inside a business: triaging inboxes, extracting data from documents, enriching leads, drafting replies, summarising calls into the CRM.

**Anatomy of an automation**
1. **Trigger:** a new email, form submission, file upload, webhook, or a schedule.
2. **Steps:** fetch data, call a model (classify, extract, draft), call other systems.
3. **Decision:** route based on the result: auto-handle, send for review, or escalate.
4. **Action:** update the CRM, send the reply, create the ticket.
5. **Record:** log what happened and why, for audit and for improving it later.

**Pick the right process.** Good first candidates are *high volume, low risk, easy to check*: tagging tickets, pulling fields from invoices, summarising meetings. Avoid starting with anything where a single mistake is expensive (payments, legal commitments, medical advice).

**Human in the loop.** Design for three tiers:
- **Confident and low risk:** do it automatically.
- **Uncertain or medium risk:** draft it and ask a person to approve with one click.
- **High risk or unclear:** hand it to a person with the context already gathered.
Start with more review than you think you need, measure how often people change the AI's draft, and automate further only where they almost never do.

**Make it robust.** Automations run unattended, so plan for failure: retries with backoff, idempotency (running a step twice must not send two emails), alerts when error rates rise, and a dead-letter queue for items that keep failing.

**Tools.** Visual workflow tools like **n8n** (open source, self-hostable), Zapier and Make let you connect hundreds of apps and drop AI steps in between. They are excellent for internal automation and prototypes. When a workflow becomes core to your product or needs heavy custom logic, move it into code (a queue plus workers, Module 7).`,
        },
        {
          type: "youtube",
          title: "n8n beginner course: introduction to automation",
          url: "https://www.youtube.com/watch?v=4BVTkqbn_tY",
          body: "The first episode of n8n's official course: triggers, nodes and how data flows through a workflow. Follow along with a free n8n instance and build one small automation.",
          source: { type: "youtube", name: "n8n", url: "https://www.youtube.com/watch?v=4BVTkqbn_tY" },
        },
        tutorial(
          "ZHH3sr234zY",
          "n8n masterclass: AI agents and automations",
          "Nate Herk",
          "A long build-along from first workflow to a RAG agent, with workflows as tools, HTTP requests to any API, and error workflows. Pick one repetitive task from your own work and automate it end to end, with an approval step before anything is sent.",
          { optional: true },
        ),
        {
          type: "resource",
          title: "n8n: advanced AI",
          url: "https://docs.n8n.io/advanced-ai/",
          body: "How to add LLM steps, agents and retrieval to n8n workflows, with templates to start from.",
          source: { type: "resource", name: "n8n", url: "https://docs.n8n.io/advanced-ai/" },
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("Idempotent step", "A step that has the same effect whether it runs once or several times, so retries cannot cause duplicates."),
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "You are automating replies to customer emails. Which rollout is safest?",
            [
              "Send every AI reply automatically from day one",
              "Have the AI draft replies for one-click human approval, track edits, then automate the categories that are rarely changed",
              "Only automate the most complex complaints",
              "Let the AI decide which emails to ignore",
            ],
            [1],
          ),
        },
      ],
    },
  ],
};
