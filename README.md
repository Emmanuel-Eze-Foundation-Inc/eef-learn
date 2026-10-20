# EEF Learn

**Learn anything. See the whole map.**

Open-source learning maps from the [Emmanuel Eze Foundation](https://www.emmanuelezefoundation.org). This repo is the foundation site and EEF Learn: pick a topic, get a course you can walk, and publish it for anyone else to travel.

Live at [www.emmanuelezefoundation.org](https://www.emmanuelezefoundation.org). `emmanuelezefoundation.org` redirects there. EEF Learn is at [/learn](https://www.emmanuelezefoundation.org/learn).

## What it does

- **Learning maps.** A topic becomes a course: modules and lessons on a map you can move through in any direction. The lesson in front of you stays in focus. Nodes show the real content type, and finished work is visible on the map.
- **Every content type.** Readings, YouTube, video, audio, images, documents, articles, resources, embeds, code, quizzes, and flashcards. Quizzes tell you right or wrong. They do not keep a score.
- **Build it two ways.** Watch a course agent research the topic and fill the map, or build it yourself in the studio. Creators edit blocks, connect lessons, review, and publish.
- **Community maps.** Search public maps, see their nodes, and enter one. A full map is the share preview. Traveling it and saving progress needs an account.
- **Your own AI.** The foundation holds no model key and grants no credits. Creators connect OpenRouter, OpenAI, Anthropic, or Google, or use their own assistant over MCP. The tutor, Owlbert, uses that key.
- **The foundation site.** The homepage is the Emmanuel Eze Foundation: the path from food and classrooms through bootcamps to a place anyone can learn. Partnership and volunteer forms live there. [Unseen Engine](https://myunseenengine.com) is the sponsor.

Sign-in is email or Google. You must be 13 or older. Preview is free. Entering a map needs an account.

## Stack

| Part | Where it runs |
|---|---|
| Web (`apps/web`) | Next.js on Vercel |
| Course agent and tutor (`apps/ai`) | FastAPI on Google Cloud Run |
| Database | Postgres and pgvector on Neon |
| Auth | Better Auth, including Google |
| Email | Resend over SMTP |
| Monorepo | Turborepo and pnpm |

Self-hosting with Docker is in [docs/self-hosting.md](docs/self-hosting.md). The hosted layout is in [docs/deploy.md](docs/deploy.md).

## License

[MIT](LICENSE). Free to use, self-host, fork, and build on.
