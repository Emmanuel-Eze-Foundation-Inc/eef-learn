import { card, quiz, tutorial, type LessonSpec } from "../../course-spec";

export const m8: LessonSpec = {
  slug: "mastery",
  title: "Mastery: ship and operate",
  blocks: [
    {
      type: "ai_text",
      title: "What this module gives you",
      body: `Everything comes together here. You will design, build and deploy a complete AI product as a capstone, judged against a professional rubric, and learn how strong teams keep AI products improving after launch.

Finishing the capstone is the real test of mastery: a deployed product with retrieval or automation, an eval suite, observability and cost controls is exactly what employers and clients look for.`,
    },
  ],
  lessons: [
    {
      slug: "capstone",
      title: "Capstone: build and ship an AI product",
      blocks: [
        {
          type: "ai_text",
          title: "The brief",
          body: `Build and deploy an AI product that solves a real problem for a real group of people. Pick one track:

- **Knowledge assistant:** answers questions over a document collection (a course, a company handbook, a set of regulations) with citations.
- **Automation:** takes a real repetitive process (inbox triage, invoice extraction, lead research) from trigger to action, with human approval where it matters.
- **Agent:** completes a multi-step task with tools (research a topic and write a briefing; diagnose a support case across two systems).

**Required**
1. **A written spec** (one page): users, the problem, what success looks like, and what the AI must never do.
2. **A working backend API** with authentication, input validation and structured outputs where code consumes results.
3. **Retrieval, tools or a workflow** appropriate to the track, with permissions enforced in code.
4. **An eval suite** of at least 30 cases built from error analysis: code assertions plus at least one LLM judge you validated against your own labels. Report the pass rate.
5. **Safety:** a short threat model covering prompt injection and data leakage, and the controls you added.
6. **Deployment:** containerised, configured through environment variables, running at a public HTTPS URL with a health check.
7. **Observability:** per-request traces with tokens, cost and latency, plus a simple dashboard or report.
8. **Reliability:** timeouts, retries with backoff, and a fallback or graceful failure message.
9. **A cost estimate** at 1,000 and 100,000 users, with one optimisation you made and its measured effect.
10. **A demo** (a short video or live link) and a README explaining how to run it.

**Rubric** (each scored 0 to 3: missing, basic, solid, excellent)

| Area | What "excellent" looks like |
|---|---|
| Problem and spec | Clear users and success criteria; the build matches the spec |
| Core quality | Eval pass rate reported per failure category, improved over iterations |
| Engineering | Clean API, validated inputs and outputs, sensible architecture |
| Safety | Realistic threat model; least privilege; approvals for risky actions |
| Operations | Deployed, observable, resilient to provider failures |
| Cost | Measured cost per request and a demonstrated optimisation |
| Communication | A README and demo a stranger can follow |

A score of 2 or more in every area means you have mastered the material. Publish your project and share it; a deployed product with honest evals is the best portfolio piece you can have.

**Suggested timeline:** week 1 spec and first working version; week 2 error analysis and evals; week 3 safety, deployment and observability; week 4 cost work, polish and demo.`,
        },
        tutorial(
          "ldFONBo2CR0",
          "Deploy a RAG app to production",
          "pixegami",
          "An end-to-end reference for the capstone: an AI app with an API, async workers, a database for queries and answers, and serverless deployment to AWS with infrastructure as code. Your stack can differ; use it to see how all the pieces connect.",
        ),
        {
          type: "quiz",
          title: "Ready to start?",
          body: quiz(
            "Before you write any capstone code, which of these should you have? Pick all that apply.",
            [
              "A one-page spec with users and success criteria",
              "A list of things the AI must never do",
              "A finished Kubernetes cluster",
              "A plan for how you will evaluate quality",
            ],
            [0, 1, 3],
          ),
        },
        {
          type: "flashcard",
          title: "Recall",
          body: card("The ten capstone requirements, in one line", "Spec, API, retrieval/tools/workflow, evals, safety, deployment, observability, reliability, cost estimate, demo."),
        },
      ],
    },
    {
      slug: "operating-and-iterating",
      title: "Operating and iterating",
      blocks: [
        {
          type: "ai_text",
          title: "Launch is the start",
          body: `AI products drift. Users ask new kinds of questions, your documents change, providers update or retire models, and costs move. Teams that keep winning run a steady loop.

**The improvement loop**
1. **Collect signals:** traces, thumbs up/down, edits people make to AI drafts, escalations to humans, support tickets.
2. **Analyse:** weekly error analysis on a sample, focused on the newest and most frequent failures.
3. **Turn failures into evals** so they stay fixed.
4. **Change one thing** (a prompt, the retrieval, a tool, the model) and run the full suite.
5. **Ship gradually** and watch the metrics.

**Model upgrades.** New models arrive constantly and are often better *and* cheaper. With a good eval suite, trying one is an afternoon: swap the model id, run the suite, compare quality, cost and latency, and roll out if it wins. Pin exact model versions in production so behaviour doesn't change under you without a test.

**Version everything.** Prompts, model settings, retrieval settings and eval sets all live in version control, and each response records which versions produced it. When quality drops, you can find what changed.

**Product feedback loops.** Design the interface so users can correct the AI easily: edit a draft, pick a different answer, flag a bad source. Every correction is free training data for your evals, and possibly for fine-tuning later.

**Keep learning.** This field moves fast. Follow a few practitioners whose work you trust, read model release notes for the providers you use, and rebuild a small project every few months with the newest tools. The fundamentals in this course (context, evals, reliability, cost, safety) change much more slowly than the tools.`,
        },
        {
          type: "youtube",
          title: "What's next for AI agentic workflows",
          url: "https://www.youtube.com/watch?v=sal78ACtGTc",
          body: "Andrew Ng on reflection, tool use, planning and multi-agent collaboration, and why agentic workflows can make today's models perform like tomorrow's. A good view of where the field is heading.",
          source: { type: "youtube", name: "Sequoia Capital", url: "https://www.youtube.com/watch?v=sal78ACtGTc" },
        },
        {
          type: "youtube",
          title: "Tips for building AI agents",
          url: "https://www.youtube.com/watch?v=LP5OCa20Zpg",
          body: "Anthropic engineers share what they have learned building and operating agents: when to use them, how to debug them, and what changes as models improve.",
          source: { type: "youtube", name: "Anthropic", url: "https://www.youtube.com/watch?v=LP5OCa20Zpg" },
        },
        tutorial(
          "O--lEvvfWf8",
          "Collect user feedback on every answer",
          "Langfuse",
          "Build a chat UI with Gradio that traces every conversation and records thumbs up/down against the exact response. This is the feedback loop from the reading: each thumbs-down becomes a candidate eval case.",
        ),
        {
          type: "blog",
          title: "Writing effective tools for agents",
          url: "https://www.anthropic.com/engineering/writing-tools-for-agents",
          body: "How to design, evaluate and improve the tools your agents use, including using agents to improve their own tools. A natural next step after the capstone.",
          source: { type: "blog", name: "Anthropic", url: "https://www.anthropic.com/engineering/writing-tools-for-agents" },
        },
        {
          type: "quiz",
          title: "Check",
          body: quiz(
            "A new model is released that is 40% cheaper. What is the safe way to adopt it?",
            [
              "Switch production immediately; newer is better",
              "Run your eval suite with the new model, compare quality, cost and latency, then roll out gradually if it wins",
              "Wait a year until everyone else has switched",
              "Ask the model whether it is better",
            ],
            [1],
          ),
        },
        {
          type: "quiz",
          title: "Final check",
          body: quiz(
            "Which practices keep an AI product improving after launch? Pick all that apply.",
            [
              "Turning every real failure into an eval case",
              "Pinning model versions and testing upgrades with evals",
              "Editing prompts directly in production without tests",
              "Regular error analysis on fresh traces",
            ],
            [0, 1, 3],
          ),
        },
      ],
    },
  ],
};
