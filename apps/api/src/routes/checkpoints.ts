import { zValidator } from "@hono/zod-validator";
import { createCheckpointSchema } from "@agent-editor/schemas";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { checkpoints, sessions } from "../db/schema.js";
import { SandboxService } from "../services/sandbox.service.js";
import { env } from "../env.js";

const sandboxService = SandboxService.fromEnv(env);

export const checkpointsRouter = new Hono();

// POST /api/sessions/:id/checkpoint — Create a checkpoint
checkpointsRouter.post(
  "/",
  zValidator("json", createCheckpointSchema),
  async (c) => {
    const sessionId = c.req.param("sessionId");
    const { label } = c.req.valid("json");

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    if (!session.sandboxId) {
      return c.json({ error: "Session has no active sandbox" }, 400);
    }

    const sandboxCheckpointId = await sandboxService.checkpoint(sessionId);
    const checkpointId = crypto.randomUUID();

    await db.insert(checkpoints).values({
      id: checkpointId,
      sessionId,
      sandboxCheckpointId,
      label: label ?? null,
      createdAt: new Date(),
    });

    return c.json({ id: checkpointId, sandboxCheckpointId, label }, 201);
  }
);

// POST /api/sessions/:id/restore/:checkpointId — Restore to a checkpoint
checkpointsRouter.post("/restore/:checkpointId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const checkpointId = c.req.param("checkpointId");

  const checkpoint = await db.query.checkpoints.findFirst({
    where: eq(checkpoints.id, checkpointId),
  });

  if (!checkpoint || checkpoint.sessionId !== sessionId) {
    return c.json({ error: "Checkpoint not found" }, 404);
  }

  await sandboxService.restore(sessionId, checkpoint.sandboxCheckpointId);

  return c.json({ success: true, restoredTo: checkpointId });
});

// GET /api/sessions/:id/checkpoints — List checkpoints for a session
checkpointsRouter.get("/list", async (c) => {
  const sessionId = c.req.param("sessionId");

  const list = await db.query.checkpoints.findMany({
    where: eq(checkpoints.sessionId, sessionId),
  });

  return c.json(list);
});
