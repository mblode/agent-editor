import { z } from "zod";

export const createSessionSchema = z.object({
  pageId: z.string().optional(),
  skillNames: z.array(z.string()).default(["linktree-editor"]),
  useSandbox: z.boolean().default(false),
  maxTurns: z.number().int().min(1).max(50).default(10),
  permissionMode: z.enum(["auto", "strict", "permissive"]).default("auto"),
});

export const sessionSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  status: z.enum(["active", "ended", "error"]),
  skillNames: z.array(z.string()),
  claudeSessionId: z.string().nullable(),
  pageId: z.string().nullable(),
  createdAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  sandboxId: z.string().nullable(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
