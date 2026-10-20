# A separate agent server over gRPC, and MCP for course creation

Status: proposed 19 Oct 2026. Modeled on Unseen Engine ADR 0013 (`unseen-engine/docs/adr/0013-agent-server-grpc-mcp.md`), adapted to a Next.js application server. Course creation follows the Map Creation Protocol ([`docs/protocol/map-creation.md`](../protocol/map-creation.md)); where this record and the protocol differ, the protocol wins.

## Decision

**Three services, two gRPC contracts.**

| | Application server | Protocol service | Agent server |
| --- | --- | --- | --- |
| Code | `apps/web` (Next.js) | `apps/protocol` (TypeScript, Prisma) | `apps/agents` (Python, replaces `apps/ai`) |
| Owns | Accounts and sessions (Better Auth), progress, access, settings, the MCP endpoint, the public API, the UI | The Map Creation Protocol: tool contract, state machine, gate checks, research cache, URL ledger, every write to maps, nodes, edges and blocks | Agent configs and versions, the run queue, runs and events, LangGraph checkpoints, model calls |
| Writes | Product tables other than course content | Course content and protocol state | Only the `agents` schema |
| Hosted on | Vercel | Google Cloud Run (gRPC, HTTP/2, TLS) | Google Cloud Run (gRPC, HTTP/2, TLS) |

- `proto/eef/protocol/v1/protocol.proto`: the application server (for MCP and API routes) and the agent server call the protocol service.
- `proto/eef/agents/v1/agents.proto`: the application server calls the agent server to start, follow and cancel runs.

The application server never imports LangGraph, Deep Agents, or LangChain. The agent server writes no product table and holds no protocol rule. Only the protocol service writes course content. Prisma (`packages/db`) owns every migration. A test checks each rule.

**Every interface goes through the application server.** Web, the Expo app, MCP clients (Claude, Cursor, ChatGPT), and anything later call the application server. Nothing outside reaches the agent server. Mobile and web share a versioned public API (`/api/v1`, with an OpenAPI document).

**One protocol service, three entry points** (`apps/protocol`). Every map is built through the protocol's tool contract (`map.status`, `map.start`, `brief.submit`, `concepts.submit`, `outcomes.submit`, `skeleton.submit`, `unit.spawn`, `node.plan`, `block.submit`, `node.complete`, `map.verify`, `map.publish`, and the rest). It is defined once in protobuf (`proto/eef/protocol/v1/protocol.proto`) and served three ways: gRPC for our LangGraph agent, MCP tools for outside agents, and API routes. The protocol service owns the state machine (`intake → research → outcomes → skeleton → content → verify → ready → published`) and every gate check, and it is the only code that writes course content. Our agent holds no rule the server does not also enforce. When a run starts, the application server mints a short-lived token scoped to that user and that map and passes it in `StartRun`; the agent calls the protocol with it, so permissions and the activity log apply to agent calls exactly as to a person's.

**Agents are configs.** Every agent is one Deep Agent template (`create_deep_agent`) built by one factory with a versioned config: prompt, model, tools, sub-agents and their models, limits. A save is a new version; activating an earlier one is the rollback. The course creator runs the protocol's recursive design cycle: each level (course, module, lesson, content item) is a LangGraph subgraph, siblings fan out as parallel branches, and each worker gets a server-built context packet and returns a receipt. Its prompts are the protocol's three parts in `packages/protocol/prompts/`. The course editor is today's studio agent.

**Runs are durable.** A run is a row in `agents.runs` before anything runs. Workers claim with `FOR UPDATE SKIP LOCKED` and hold a heartbeat lease. An expired lease is claimed again and the graph resumes from its LangGraph checkpoint (thread = run id), so a phone that loses signal reconnects to the same build. `StartRun` is idempotent on its key. Budget, timeout, and cancel stop a run and say why. The user's model key is decrypted by the application server and travels only inside `StartRun`; the agent server never stores it.

**Everything is logged.** Every MCP call, every run transition, and every config change is in `activity`, with the actor and the request id. The request id travels from the browser or MCP client, over gRPC, into the run and its events.

## MCP

- Endpoint: `/api/mcp`, streamable HTTP, stateless, served by `mcp-handler` on Vercel.
- Sign-in, both ways:
  - **OAuth** through Better Auth's MCP support. The user approves the client in the browser. This is for Claude, ChatGPT, and Cursor.
  - **Personal API tokens** created in Settings and sent as `Authorization: Bearer`. This is for scripts and CI. A token can be revoked, and shows when it was last used.
- Tools: the protocol's tool contract, one MCP tool per operation, plus `edit_course`, `get_run` and `cancel_run` for the studio agent and hosted runs.
- Prompts: the protocol's three parts, plus `map_creation_protocol` (shared rules and the course-level unit builder) for outside clients.
- Scope: everything the creator can do on their own maps. `map.publish` is a tool, but the server refuses it until `map.verify` has passed and the creator has confirmed in the app. No agent publishes on its own.
- MCP runs use the outside client's own model, so the platform pays for no generation; only research and YouTube calls run on our side.
- Every call is logged with the client name, so the creator can see which agent did what.

## Survival

- The gRPC client sets a deadline on every call and retries `UNAVAILABLE` for reads and idempotent starts only.
- A circuit breaker answers "The course agent is unavailable" at once while the agent server is down. Everything else (learning, the studio, publishing, MCP reads and writes) keeps working.
- The agent server serves the standard gRPC health service. On SIGTERM it reports NOT_SERVING, stops claiming, and finishes inside the grace period.
- Cloud Run keeps at least one instance with CPU always allocated, so queued runs are claimed without a request.
- Vercel functions have a time limit, so the browser follows a run by polling `get_run` events with a last-seen cursor. It does not hold one long stream. This is how the job checkpoints already work.

## What changes from today

- `apps/ai` endpoints `/chat` and `/agent/course-edit`, and the `GenerationJob` worker, move behind gRPC in `apps/agents`.
- The skeleton and section pipelines stop writing `Node` and `ContentBlock` rows directly. They call the protocol instead.
- The size caps in `SKELETON_PROMPT` ("4 to 12 nodes") and `SECTION_PROMPT` ("3-6 short paragraphs") go; the protocol's prompts replace them.
- Design decision D11 ("no heavy harness") is reversed; record it in `docs/designs/eef-learn-platform.md` and close its `TODOS.md` item.
- Hosting moves from Heroku to Vercel, Cloud Run, and Neon. `heroku.yml` and `docker/heroku.Dockerfile` are retired after the cutover.

## Video checks

The agent checks what a YouTube video teaches from its description and chapters (YouTube Data API), not transcripts. Videos without chapters are judged on description and title together with the lesson's other sources, and a weak match is reported as an open issue rather than used. Revisit with a multimodal model if quality falls short.

## Tickets

Each ticket is built, reviewed, QA'd, then merged to `dev`.

1. **Contracts.** `proto/eef/protocol/v1/protocol.proto` (the protocol's tool contract) and `proto/eef/agents/v1/agents.proto`: `StartRun`, `GetRun`, `ListRunEvents` (cursor), `StreamRunEvents`, `CancelRun`, `ListAgents`, `GetAgent`, `SaveAgentVersion`, `ActivateAgentVersion`, `ListTools`, `GetServerInfo`. Codegen with `buf` for Python (`grpcio`) and TypeScript (Connect, gRPC protocol). CI fails when the generated code is stale.
2. **Agent server skeleton.** `apps/agents`: gRPC server, health service, graceful shutdown, `agents` schema (migrated by Prisma), run queue with lease and backoff, service-token auth, request-id propagation. The existing chat and course-edit paths are ported unchanged behind `StartRun`.
3. **Application server client.** `apps/web/lib/agents`: deadlines, retries, circuit breaker. Companion chat, the studio agent, and Watch it build call gRPC instead of HTTP. Tests check that `apps/web` imports no agent code and that `apps/agents` writes no product table.
4. **Protocol service** (`apps/protocol` on Cloud Run). The tool contract, the state machine (migration on `Map` or a `MapProtocolRun` table), every gate check, per-node outcomes, the per-run research cache and URL ledger, and the `activity` table. The studio routes call it too, so there is one place that validates and writes.
5. **MCP endpoint.** `/api/mcp` with every tool above, personal API tokens, and logging.
6. **MCP OAuth.** Better Auth MCP sign-in, a consent screen, and connected apps in Settings, with revoke.
7. **Settings: API tokens and connected apps.** Create, name, copy once, revoke, last used.
8. **LangGraph and Deep Agents.** Factory, versioned configs, and the course creator: the recursive design cycle as subgraphs, parallel fan-out, context packets and receipts, adaptive concurrency from the creator's key, per-step model routing, cost estimate and spend ceiling, checkpoints, events.
8b. **Content types.** Section work writes youtube (with `start_s`, `end_s`, `watch_for`, `takeaway`, and segment playback in the player), blog, quiz and flashcard blocks, not only `ai_text`.
9. **Agents screen.** Admin view of agents, versions, activation, runs, and spend.
10. **Public API v1.** `/api/v1` with an OpenAPI document, shared by web and the Expo app.
11. **Deploy.** Vercel (web, API, MCP), Cloud Run (protocol service and agents, HTTP/2; agents keep min one instance), Neon (Postgres with pgvector), migrations on deploy, secrets, health checks. Update `CLAUDE.md` deploy configuration and `docs/self-hosting.md` (docker compose runs the migrate job, web, the protocol service, and two agent servers).

## Still open

- The protocol's open questions: MCP build-ahead, moderation.
- Cloud Run region and Neon region (keep them together; Vercel functions in the same region).
- Whether self-hosters keep a single-container option. Docker compose covers local and self-hosting either way.
