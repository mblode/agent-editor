# Agent Editor

AI-powered Linktree editor — Claude agent embedded in the editor's Chat panel. Users type natural language; the agent reads their page state, proposes and applies block mutations, all in a streaming multi-turn session with full undo/redo support.

## Architecture

```
Browser (Next.js)
  └─ EventSource SSE stream + REST
       └─ Hono API (apps/api)
            └─ @anthropic-ai/claude-code SDK  ← programmatic, NOT CLI
                 └─ Sprites.dev / Docker sandbox
```

## Monorepo Structure

```
agent-editor/
├── apps/
│   ├── api/          Hono REST + SSE API server
│   └── web/          Next.js dashboard
├── packages/
│   ├── agent-sdk/    AgentRunner, StructuredAgent, hooks
│   ├── skills/       Markdown skill files + SkillLoader/Injector
│   ├── schemas/      Shared Zod schemas
│   └── db/           Drizzle schema (reference)
└── docker/
    ├── Dockerfile.sandbox
    └── docker-compose.yml
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example apps/api/.env
# Fill in ANTHROPIC_API_KEY and ENCRYPTION_KEY
```

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Run the API

```bash
# Database setup (first time)
cd apps/api && npx drizzle-kit push && cd ../..

# Start API server
npm run dev --workspace=apps/api
```

### 4. Run the web app

```bash
npm run dev --workspace=apps/web
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sessions` | Create agent session |
| `GET` | `/api/sessions/:id/stream?prompt=...` | SSE stream |
| `POST` | `/api/sessions/:id/messages` | Send message (returns SSE stream) |
| `DELETE` | `/api/sessions/:id` | End session |
| `POST` | `/api/sessions/:id/checkpoint` | Snapshot sandbox state |
| `POST` | `/api/sessions/:id/restore/:checkpointId` | Restore snapshot |
| `GET` | `/api/skills` | List available skills |
| `POST` | `/api/tasks` | One-shot structured task |
| `GET` | `/health` | Health check |

## Skills

Skills are Markdown files in `packages/skills/skills/` that define agent personas, capabilities, and constraints. They are composed and injected as the system prompt at session start.

| Skill | Description |
|-------|-------------|
| `linktree-editor` | Main agent persona — block CRUD, analysis, design |
| `structured-output` | JSON output format instructions |
| `block-manager` | Precise block mutation rules |
| `theme-designer` | Visual design recommendations |

Add a new skill by creating a `.md` file in `packages/skills/skills/`.

## Sandbox

The `SandboxService` supports three backends:
- **Sprites.dev** (production): Set `SPRITES_TOKEN` env var
- **Docker** (local): Requires Docker daemon and sandbox image
- **None** (default dev): No-op, agent runs without isolation

Build the sandbox image:
```bash
docker build -f docker/Dockerfile.sandbox -t agent-editor-sandbox:latest .
```

## Structured Output

The `StructuredAgent` class wraps `AgentRunner` and validates outputs against a Zod schema. Use it for one-shot tasks via `POST /api/tasks`:

```typescript
import { StructuredAgent } from "@agent-editor/agent-sdk";
import { agentResponseSchema } from "@agent-editor/schemas";

const agent = new StructuredAgent(agentResponseSchema);
const result = await agent.run({
  prompt: "Analyze my page for better CTR",
  systemPrompt,
  anthropicApiKey,
});
// result is typed as AgentResponse
```

## Key Technical Decisions

- **Agent SDK over CLI**: `@anthropic-ai/claude-code`'s `query()` gives typed streaming, session resumption, programmatic hooks, and clean BYOK injection
- **SSE over WebSockets**: Half-duplex fits the agent streaming model perfectly; auto-reconnects natively
- **Sprites.dev over E2B**: Persistent state + checkpoint/restore needed for multi-turn sessions
- **Zod everywhere**: All API inputs/outputs validated; discriminated unions for agent response types
