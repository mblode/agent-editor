import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { checkpointsRouter } from "./routes/checkpoints.js";
import { sessionsRouter } from "./routes/sessions.js";
import { skillsRouter } from "./routes/skills.js";
import { tasksRouter } from "./routes/tasks.js";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN,
    allowHeaders: ["Content-Type", "X-Workspace-ID"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

// Auth middleware for all /api routes
app.use("/api/*", authMiddleware);

// Routes
app.route("/api/sessions", sessionsRouter);
app.route("/api/sessions/:sessionId/checkpoint", checkpointsRouter);
app.route("/api/skills", skillsRouter);
app.route("/api/tasks", tasksRouter);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Start server
serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`🚀 API server running at http://localhost:${info.port}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   CORS origin: ${env.CORS_ORIGIN}`);
  }
);

export type AppType = typeof app;
