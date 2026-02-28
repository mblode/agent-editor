import { zValidator } from "@hono/zod-validator";
import { createSessionSchema, sendMessageSchema } from "@agent-editor/schemas";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { SSEStreamingApi } from "hono/streaming";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions } from "../db/schema.js";
import { AgentService } from "../services/agent.service.js";
import { SkillsService } from "../services/skills.service.js";
import { SandboxService } from "../services/sandbox.service.js";
import { env } from "../env.js";

const agentService = new AgentService();
const skillsService = new SkillsService();
const sandboxService = SandboxService.fromEnv(env);

export const sessionsRouter = new Hono();

type SessionRow = typeof sessions.$inferSelect;

async function getActiveSession(sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });
  return session ?? null;
}

async function streamAgentForSession(
  stream: SSEStreamingApi,
  session: SessionRow,
  prompt: string,
  anthropicKey: string,
  workspaceId: string
) {
  const skillNames: string[] = JSON.parse(session.skillNames);
  const systemPrompt = await skillsService.buildSystemPrompt(skillNames, { workspaceId });

  let turnsUsed = 0;
  let capturedSessionId: string | undefined;

  for await (const event of agentService.run({
    prompt,
    sessionId: session.claudeSessionId ?? undefined,
    systemPrompt,
    anthropicApiKey: anthropicKey,
    maxTurns: session.maxTurns,
  })) {
    // Capture Claude's internal session ID for resumption
    if (
      event.type === "system" &&
      event.subtype === "init" &&
      event.sessionId &&
      !capturedSessionId
    ) {
      capturedSessionId = event.sessionId;
      await db
        .update(sessions)
        .set({ claudeSessionId: capturedSessionId })
        .where(eq(sessions.id, session.id));
    }

    if (event.type === "done") {
      turnsUsed = event.turnsUsed ?? turnsUsed;
    }

    await stream.writeSSE({
      data: JSON.stringify(event),
      event: event.type,
    });

    if (event.type === "done" || event.type === "error") {
      break;
    }
  }

  return turnsUsed;
}

// POST /api/sessions — Create a new agent session
sessionsRouter.post(
  "/",
  zValidator("json", createSessionSchema),
  async (c) => {
    const body = c.req.valid("json");
    const workspaceId = c.get("workspaceId");

    const sessionId = crypto.randomUUID();
    const now = new Date();

    await db.insert(sessions).values({
      id: sessionId,
      workspaceId,
      status: "active",
      skillNames: JSON.stringify(body.skillNames),
      pageId: body.pageId ?? null,
      maxTurns: body.maxTurns,
      createdAt: now,
    });

    if (body.useSandbox) {
      try {
        const sandbox = await sandboxService.create(sessionId);
        await db
          .update(sessions)
          .set({ sandboxId: sandbox.providerId })
          .where(eq(sessions.id, sessionId));
      } catch (err) {
        console.warn("Failed to create sandbox:", err);
      }
    }

    return c.json(
      {
        sessionId,
        streamUrl: `/api/sessions/${sessionId}/stream`,
      },
      201
    );
  }
);

// GET /api/sessions/:id — Get session details
sessionsRouter.get("/:id", async (c) => {
  const sessionId = c.req.param("id");
  const session = await getActiveSession(sessionId);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json(session);
});

// GET /api/sessions/:id/stream — SSE stream for agent responses
// Usage: GET /api/sessions/:id/stream?prompt=<initial message>
sessionsRouter.get("/:id/stream", async (c) => {
  const sessionId = c.req.param("id");
  const prompt = c.req.query("prompt") ?? "";
  const anthropicKey = c.get("anthropicKey");
  const workspaceId = c.get("workspaceId");

  const session = await getActiveSession(sessionId);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  if (session.status !== "active") {
    return c.json({ error: "Session is not active" }, 400);
  }

  return streamSSE(c, async (stream) => {
    const turnsUsed = await streamAgentForSession(stream, session, prompt, anthropicKey, workspaceId);

    await db
      .update(sessions)
      .set({ turnsUsed: session.turnsUsed + turnsUsed })
      .where(eq(sessions.id, sessionId));
  });
});

// POST /api/sessions/:id/messages — Send a message to an existing session
sessionsRouter.post(
  "/:id/messages",
  zValidator("json", sendMessageSchema),
  async (c) => {
    const sessionId = c.req.param("id");
    const { content } = c.req.valid("json");
    const anthropicKey = c.get("anthropicKey");
    const workspaceId = c.get("workspaceId");

    const session = await getActiveSession(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    if (session.status !== "active") {
      return c.json({ error: "Session is not active" }, 400);
    }

    return streamSSE(c, async (stream) => {
      await streamAgentForSession(stream, session, content, anthropicKey, workspaceId);
    });
  }
);

// DELETE /api/sessions/:id — End a session
sessionsRouter.delete("/:id", async (c) => {
  const sessionId = c.req.param("id");
  const session = await getActiveSession(sessionId);

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  if (session.sandboxId) {
    try {
      await sandboxService.destroy(sessionId);
    } catch (err) {
      console.warn("Failed to destroy sandbox:", err);
    }
  }

  await db
    .update(sessions)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  return c.json({ success: true });
});
