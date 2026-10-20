# EEF Learn — Map Creation Protocol

Oct 19, 2026 · Emmanuel Eze. Adapted to the app as it is on `dev` (course player, course studio, twelve block types, map access). Prompts: [`packages/protocol/prompts/`](../../packages/protocol/prompts/). Architecture: [`docs/adr/0001-agent-server-grpc-mcp.md`](../adr/0001-agent-server-grpc-mcp.md).

Every learning map on EEF Learn is built by one procedure, whether the builder is our LangGraph agent, a third-party agent over MCP (such as Claude in a learner's own chat), or a client calling the API. The prompt tells an agent how to follow it; the protocol service enforces it as a state machine so no agent can skip a step. A creator building by hand in the studio is not on the protocol, but meets the same publish check.

## The app it builds

| Protocol level | Platform object | What the learner sees |
| --- | --- | --- |
| Course | `Map` (title, topic, `brief`, `sourcePolicy`, `version`, `visibility`) | The course: sidebar outline, lesson view, and the map view, in the course player at `/maps/[slug]`; the full-map preview at `/share/[slug]` |
| Module | A top-level `Node` (`parentId` null). If the map has exactly one root with children, that root is the course intro and its children are the modules | A module in the sidebar and a column on the map. A module node can hold blocks of its own, and then it is also a lesson |
| Lesson | A `Node` under a module, at any depth. Deeper levels (sub-modules) are listed inside their module in travel order and indented by depth | One lesson page, with "Complete & continue" |
| Content item | A `ContentBlock` (`type`, `title`, `body`, `url`, provenance, `mapVersion`) with `Attribution` rows | One part of the lesson: Read, Watch, Listen, Look, Try, Study, Check, Recall |

Rules the app already applies, which the protocol builds on:

- **Travel order** is depth-first through the tree by sibling `order`. The first stop is labelled Start, the last Finish.
- **Prerequisite `Edge`s lock lessons.** A lesson with prerequisites stays locked until each prerequisite is mastered. The edge set must be acyclic and must not contradict travel order (a prerequisite comes before what needs it).
- **Slugs are stable** within a map (`@@unique([mapId, slug])`). A regeneration bumps `Map.version`; blocks carry `mapVersion`; progress written against an old version is rejected.
- **Checks show right or wrong only.** Quizzes and flashcards record nothing; mastery is the learner completing the lesson.
- **Who can travel:** `public` maps, anyone; `unlisted`, anyone with the link; `private`, the creator and learners whose access request the creator approved (`MapAccess`). Previewing the full map is free; travelling and saving progress need an account.
- **Positions:** `positionX`/`positionY` place nodes on the map; the server lays out new nodes so cards never overlap (modules as columns, lessons stacked under them).
- **Creators are 13 or older** (birthdate at sign-up). `creator_is_minor` comes from the birthdate.
- **Bring your own model:** the creator's key (OpenRouter, OpenAI, Anthropic or Google, plus an optional model) is stored encrypted and read per job. EEF Learn provides no AI credits and sets no usage limits. Without a key, AI routes return `409 model_required`; with `AI_PROVIDER=mock` keyless users get deterministic output and no model is called.
- **MCP today:** `/api/mcp` (OAuth through Better Auth) gives the creator's own assistant `list_my_maps`, `get_map`, `get_lesson`, `create_map`, `edit_map` and `set_visibility`. `edit_map` applies the studio agent's ops and the studio's block checks, but not yet the protocol's state machine.

## What the protocol changes

- A protocol layer that MCP, the API and the agent all call, so the three entry points produce the same kind of map.
- Sizing from the learner's goal replaces fixed sizes: "4-12 nodes" in `SKELETON_PROMPT`, "3-6 short paragraphs" in `SECTION_PROMPT`, and "5–10 lessons" and "one watch, one read, one idea, one check per node" in the old course-create skill.
- Recursive building: one design cycle for the course, then each module, each lesson and each content item, with fresh research at every level and subagents building siblings in parallel.
- LangGraph over gRPC, reversing design decision D11 ("no heavy harness").

## Where it runs

Three entry points call the protocol service (`apps/protocol`): the LangGraph agent (`apps/agents`) over gRPC, outside agents over MCP at `/api/mcp`, and API routes. The agent holds no rule the server does not also enforce. The studio's hand edits go through the same service for writes and validation, outside any run.

## The design cycle

Every unit, at every level, runs seven steps:

1. **Scope.** What this unit must get the learner to, from the parent's outcomes, the brief, and what neighbouring units cover.
2. **Research.** This unit specifically: how experts teach it, what learners get wrong, the best available sources.
3. **Outcomes.** What the learner can do after this unit, each one testable.
4. **Decompose.** Children, each owning a subset of the outcomes, with prerequisite order.
5. **Build children in parallel.** One subagent per child with a small context packet; each runs this same cycle one level down.
6. **Integrate.** Transitions, consistent terms, no repeated material, correct order, cross-references.
7. **Verify and report up.** Every outcome is covered and taught before it is used; send the parent a short receipt.

Depth is not fixed. Decomposition stops when a unit is one idea a learner can take in as a whole. A small topic may be course → lessons (top-level nodes are then both modules and lessons); a large one may need sub-modules. The player shows any depth, so the protocol caps nesting at **three node levels under the course** (module, sub-module, lesson) to keep the sidebar readable. It never caps content size.

| Level | Research focuses on | Decomposes into |
| --- | --- | --- |
| Course | What the field involves; how strong courses, official curricula and practitioners structure it; public EEF maps that already cover parts of it | Modules (and an intro node when the course needs a framing lesson) |
| Module | The module's concepts and how they depend on each other; common misconceptions; the strongest anchor sources and channels | Lessons, or sub-modules |
| Lesson | How experts teach this one idea; worked examples; where learners get stuck; candidate videos, readings, examples | Content items |
| Content item | Candidate sources for this exact outcome; picks the segment, angle or question | Nothing: it builds the block |

A leaf worker does not take the first match. For a video it gathers several candidates, checks each against the outcome, and picks the best segment. For a reading it writes for this learner's starting point from the sources the lesson chose. For a quiz it builds wrong options from misconceptions research found. Each block ships with its sources, one line of choice reasoning, and its attribution.

**Checking what a video teaches:** from its description and chapters (YouTube Data API), not transcripts. A video without chapters is judged on title and description together with the lesson's other sources. A weak match is reported as an open issue, never used.

## Scaling

No agent holds the whole course in its context. Work lives in Postgres; agents pass small packets and receipts.

- **Context packet** (built by the server): the brief in a few lines; the unit's title, owned outcomes and place in travel order; the parent's one-paragraph summary and outcomes; siblings as one line each; prerequisite summaries; the course glossary. Never other units' full content.
- **Receipt** (returned to the parent): ids written, a three-line summary, new glossary terms, open issues. Full output goes straight to the database through the tool contract.
- **Research cache:** one per run, keyed by normalised query and URL, so siblings reuse vetted videos and pages. This extends today's YouTube query cache.
- **Concurrency:** fan-out runs through the agent server's run queue (`FOR UPDATE SKIP LOCKED`, leases, heartbeats). Each level is a LangGraph subgraph; siblings are parallel branches; state is checkpointed to Postgres so a crashed run resumes. Worker count follows the creator's key: OpenRouter rate limits shrink the pool, successes grow it back. YouTube calls use a separate pool sized to the daily quota. Extra work waits in the queue; the course is never cut short.
- **Model routing:** strong models judge (scope, decompose, write, verify); cheap models extract (summarise a page, read metadata, draft receipts). `AI_MODEL_SKELETON`, `AI_MODEL_SECTION` and the other per-task settings extend to per-step routing.
- **Eager and lazy:** the structure (course, modules, lessons) is built eagerly so "Watch it build" shows the whole map quickly. Blocks are built for the first lessons right away, then ahead of the learner as they travel, or all at once if the creator asks. Progress reaches the browser as `GenerationJob` checkpoints, polled as today. First-section target: p90 under 60 seconds.

## Sizing without caps

The protocol never sets a number of nodes, minutes of video, words of text or quiz items. Size comes from the goal, the starting point and the depth.

1. **Scope from the goal.** Every concept the learner needs to reach the goal is in; anything that does not serve it is out.
2. **A lesson is one coherent idea.** Split when it carries two ideas a learner could master separately; merge when neither stands alone.
3. **Blocks earn their place.** Each block serves one of the lesson's outcomes. Use the part of a video that teaches it. Write as much text as the idea needs.
4. **Checks cover outcomes.** Every outcome gets at least one quiz or flashcard. More only where learners commonly confuse things.
5. **Stop when done.** A lesson is complete when every outcome has teaching material and a check. The map is complete when every concept on the path to the goal has a lesson.

Limits that remain are not content caps: cost (the creator's key pays; the agent estimates cost before a large run and the creator may set a spend ceiling) and transport size (large maps are written in batches). The lesson time the player shows is estimated from the blocks (`lessonMinutes`), for information only.

## Tool contract

One set of operations, defined once in `proto/eef/protocol/v1/protocol.proto`, exposed as gRPC for the agent, MCP tools for outside agents, and API routes. Every call returns the run's state and the actions now allowed.

| Operation | Phase | What it does | Refused unless |
| --- | --- | --- | --- |
| `map.status` | any | State, open gaps, allowed next actions | caller owns the map |
| `map.start` | Intake | Creates a private draft `Map` with a stable slug, and a protocol run | creator signed in and 13+; a key, or mock mode |
| `brief.submit` | Intake | Saves the brief to `Map.brief` | a learning goal is stated; the goal passes screening |
| `catalog.search_maps` | Research | Public maps that already cover part of the topic | — |
| `research.search` / `research.fetch` | Research | Web search and page reading | URL passes SSRF checks |
| `research.cache` | any | Sources and vetting results other workers in this run found | — |
| `concepts.submit` | Research | Concepts, their prerequisites and the sources behind each | prerequisites acyclic; each concept has a source |
| `outcomes.submit` | Outcomes | What the learner can do after each concept | every concept has an outcome |
| `skeleton.submit` | Skeleton | Writes `Node`s (with laid-out positions) and prerequisite `Edge`s; emits checkpoints | `validateSkeleton` passes; edges agree with travel order; nesting within three levels; every outcome sits on a node |
| `unit.spawn` | Build children | Queues one worker per child with a server-built context packet | the child is in the submitted decomposition |
| `unit.read` | Integrate | One child's full content | caller is that child's parent |
| `node.plan` | Content | The ordered block plan for one lesson | each planned block names the outcome it serves |
| `youtube.channel_uploads` / `youtube.search` / `youtube.videos` | Content | Lists, searches and inspects videos through the query cache | daily YouTube quota left |
| `source.inspect` | Content | Validates a URL and returns its oEmbed/OpenGraph metadata | URL is reachable, safe, and returned by a tool in this run |
| `block.submit` | Content | Writes one `ContentBlock` and its `Attribution` rows at the map's current version | body matches the type's contract; `blockProblem` is null; credit present; provenance ids point to real blocks |
| `node.complete` | Content | Marks a lesson's content done | every outcome has teaching material and a check |
| `unit.verify` / `unit.complete` | Verify | Checks one unit, then closes it and hands its receipt to the parent | every owned outcome is taught and checked |
| `map.verify` | Verify | The whole-map checks (below) | — |
| `map.publish` | Publish | Sets visibility to `unlisted` or `public` | verify passed and the creator confirmed in the app |

`map.status` keeps outside agents on the procedure: an MCP client that loses its place asks what comes next instead of guessing. The studio agent's `edit_course` operations (add, update, move, delete lessons and blocks, link and unlink prerequisites) go through the same writes and checks.

## Output contracts

Every agent writes the same shapes, mapped one-to-one onto the Prisma schema.

### Brief (`Map.brief`)

Today's four keys stay; the rest are new and optional. `sourcePolicy` is the `Map.sourcePolicy` column, not a brief key.

```json
{
  "goal": "Build and ship a small RAG app I can show in interviews",
  "audience": "Just me",
  "startingPoint": "I write Python; never touched ML",
  "depth": "thorough",
  "notes": "Skip the math proofs",
  "preferredSources": ["youtube:@SomeChannel", "https://docs.example.com"],
  "excludedSources": [],
  "language": "en"
}
```

### Skeleton

Today's contract (`validateSkeleton` in `packages/core/src/graph.ts`, `validate_skeleton` in Python), with per-node outcomes added. `parent` is a slug or null; the server turns slugs into ids and lays out positions.

```json
{
  "nodes": [
    {"slug": "foundations", "title": "Foundations", "order": 0, "parent": null,
     "outcomes": ["Explain what a retrieval-augmented app does"]},
    {"slug": "embeddings", "title": "Embeddings", "order": 0, "parent": "foundations",
     "outcomes": ["Explain what an embedding captures", "Compare two texts by cosine similarity"]}
  ],
  "edges": [{"from": "embeddings", "to": "vector-search", "kind": "prerequisite"}]
}
```

### Blocks

One `ContentBlock` per content item. `title` is the part's heading. Bodies marked JSON are stored as a JSON string in `body`. Anything the agent wrote itself carries provenance (`provenanceModel`, `provenancePromptHash`, `provenanceSourceIds`). A block reused from another public map adds an attribution with `sourceType: "community_map"` and `sourceMapId`, so credit flows to the original creator.

| type | Shows as | url | body | Credit |
| --- | --- | --- | --- | --- |
| `ai_text` | Reading | — | Markdown; claims tied to source blocks | Provenance |
| `youtube` | YouTube | Canonical watch URL (`youtube.com/watch?v=`, `youtu.be/`, `shorts/`) | JSON `{"start_s", "end_s", "watch_for", "takeaway"}` | Channel name + URL (`sourceType: "youtube"`) |
| `video` | Video | Vimeo, Loom, or an https video file | JSON `{"start_s", "end_s", "watch_for", "takeaway"}` | Creator or site + URL (`video`) |
| `audio` | Audio | https `.mp3` / `.m4a` | Show notes in the agent's own words | Creator or site + URL (`audio`) |
| `image` | Image | https image | Caption or what to notice | Creator or site + URL (`image`); only images whose licence allows reuse |
| `blog` | Article | Canonical article URL | JSON `{"site", "author", "image", "note"}`; `note` is one or two sentences in the agent's own words on why to read it, never an excerpt | Author or site + URL (`blog`) |
| `resource` | Resource | Docs, dataset, repo, download | What it is and when to use it | Site + URL (`resource`) |
| `embed` | Interactive | https embed URL (CodePen, CodeSandbox, Figma, Slides) | What to try in it | Creator or site + URL (`embed`) |
| `code` | Code | — | JSON `{"language", "code"}` | Provenance when written by the agent; source + URL when adapted from one (`resource`) |
| `pdf_extract` | Document | Optional link to the PDF | A passage from a PDF the creator uploaded and holds rights to | PDF title (`pdf`) |
| `quiz` | Quiz | — | JSON `{"prompt", "mode": "radio" \| "multi", "options": [{"id", "label"}], "correct": [ids]}` | Inherits the lesson's sources; provenance |
| `flashcard` | Flashcard | — | JSON `{"front", "back"}` | Inherits the lesson's sources; provenance |

Body rules are the app's own: `blockUrlProblem` and `blockProblem` in `apps/web/lib/blocks.ts`, `parseQuiz` and `parseFlashcard` in `apps/web/components/learn/recall-data.ts`, `parseCode` in `blocks.ts`. A quiz needs a prompt, at least two options and one correct id; more than one correct id makes it multi. Older `youtube` and `blog` blocks have a plain-text body; the player reads plain text as `watch_for` and `note`.

### Reusing community maps

- Reusing a whole public map as a module creates a `MapComposition` link pinned to that map's version, so its creator's updates arrive as `UpdateProposal`s the creator can accept.
- Copying individual blocks credits each copy to the original map (`community_map` attribution). No link is created.

## Prompts

Three parts. Every agent loads the shared rules, then either the unit builder (course, module and lesson levels) or the content item builder (leaves). The LangGraph agent composes them per graph node. The MCP server exposes the same three as prompts, plus `map_creation_protocol`, which bundles the shared rules and the course-level unit builder for outside clients. `{{double braces}}` come from the server-built context packet.

- [`shared-rules.md`](../../packages/protocol/prompts/shared-rules.md)
- [`unit-builder.md`](../../packages/protocol/prompts/unit-builder.md)
- [`content-item-builder.md`](../../packages/protocol/prompts/content-item-builder.md)

## Server-side enforcement

The prompt guides a model; in an open community the rules must hold for an agent that ignores it.

**Protocol runs.** A `MapProtocolRun` row holds each run's state: `intake → research → outcomes → skeleton → content → verify → ready`. Publishing is a map change, not a run state. A map can have many runs (the first build, a regeneration, an outside agent adding a module), and keeping state on the run means hand edits in the studio never fight a state machine. Each operation is allowed only in certain states; an out-of-order call is refused with a typed error naming the allowed actions. The LangGraph graph mirrors these states as nodes.

**Gate checks:**
- Structure: `validateSkeleton` on every skeleton submit; prerequisites acyclic and in travel order; nesting within three levels.
- Coverage: every concept and outcome on a lesson; every outcome with teaching material and a check before `node.complete`.
- Sources: every URL was returned by a tool in this run (a per-run ledger), passes the SSRF-hardened validation, resolves, and matches its type (`blockUrlProblem`). YouTube videos are embeddable and not region-locked.
- Credit: non-generated blocks have an attribution; provenance ids point to blocks that exist.
- Schema: bodies parse with the app's parsers.

**`map.verify`** runs for every publish, whether the map came from a run or the studio:
- Every map: the structure checks; every block passes `blockProblem`; at least one lesson has content; no lesson is locked behind a prerequisite that can never be reached.
- Maps built by a run also need the coverage, source and credit checks.

**Publishing.** No agent publishes on its own. `map.publish` (and the studio's Publish button) works only after `map.verify` passes and the creator confirms in the app. A private map stays shareable with approved learners without publishing.

**Bring your own key.** The hosted agent reads the creator's encrypted key per job and never logs or returns it. MCP runs use the outside client's own model, so the platform pays for no generation; only research and YouTube calls run on our side. Spend is metered per run against the creator's ceiling, if set.

**Open-community safety.** Harmful goals are refused at `brief.submit`, before research. Fetched pages, transcripts and other maps reach the model as marked data, never instructions. Articles stay link and metadata; video stays embedded through the official player; full text only from PDFs the creator uploaded. Published maps go through moderation before open publishing.

## Open questions

1. Should MCP clients be able to build content ahead for every lesson, or only the skeleton plus lessons the creator asks for?
2. Who moderates published maps before open publishing goes live?

## Repo changes

- Record the reversal of D11 in `docs/designs/eef-learn-platform.md` and close the matching `TODOS.md` item.
- `proto/eef/protocol/v1/protocol.proto` for the tool contract; served by `apps/protocol` over gRPC, as MCP tools at `/api/mcp`, and as API routes.
- Migration: `MapProtocolRun` (state, brief snapshot, URL ledger, spend), per-node outcomes, and the research cache.
- Extend `MapBrief` and `isMapBrief` (`packages/core/src/graph.ts`) and the brief schema in `apps/web/app/api/maps/route.ts` with the new optional keys.
- Remove the size limits from `SKELETON_PROMPT` and `SECTION_PROMPT` and the old course-create rules; replace them with the protocol prompts.
- Section work writes every block type, not only `ai_text`.
- YouTube and video segments: parse the JSON body (plain text falls back to `watch_for`), start and end the player at `start_s` / `end_s`, show `watch_for` before and `takeaway` after.
- Article cards read the blog JSON body (`site`, `author`, `image`, `note`), with plain text as `note`.
- Add `video`, `audio`, `image`, `resource` and `embed` to the `Attribution.sourceType` values.
- The studio's Publish button calls `map.verify` and shows what to fix.
