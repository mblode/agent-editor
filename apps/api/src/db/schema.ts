import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  encryptedAnthropicKey: text("encrypted_anthropic_key"),
  enabledSkills: text("enabled_skills").notNull().default('["linktree-editor","structured-output"]'),
  maxTurns: integer("max_turns").notNull().default(10),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
  status: text("status", { enum: ["active", "ended", "error"] }).notNull().default("active"),
  skillNames: text("skill_names").notNull().default('["linktree-editor"]'),
  claudeSessionId: text("claude_session_id"),
  pageId: text("page_id"),
  sandboxId: text("sandbox_id"),
  maxTurns: integer("max_turns").notNull().default(10),
  turnsUsed: integer("turns_used").notNull().default(0),
  tokensUsed: integer("tokens_used").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp" }),
});

export const checkpoints = sqliteTable("checkpoints", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id),
  sandboxCheckpointId: text("sandbox_checkpoint_id").notNull(),
  label: text("label"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Checkpoint = typeof checkpoints.$inferSelect;
export type NewCheckpoint = typeof checkpoints.$inferInsert;
