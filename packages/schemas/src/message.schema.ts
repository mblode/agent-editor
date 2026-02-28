import { z } from "zod";

export const agentStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    role: z.enum(["assistant", "user"]),
    content: z.array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("text"), text: z.string() }),
        z.object({
          type: z.literal("tool_use"),
          id: z.string(),
          name: z.string(),
          input: z.unknown(),
        }),
      ])
    ),
  }),
  z.object({
    type: z.literal("tool_call"),
    toolName: z.string(),
    toolInput: z.record(z.unknown()),
    id: z.string().optional(),
  }),
  z.object({
    type: z.literal("tool_result"),
    toolName: z.string(),
    result: z.unknown(),
    id: z.string().optional(),
  }),
  z.object({
    type: z.literal("agent_action"),
    actionType: z.enum(["mutation", "analysis"]),
    data: z.unknown(),
  }),
  z.object({
    type: z.literal("system"),
    subtype: z.string(),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal("done"),
    turnsUsed: z.number().optional(),
    tokensUsed: z.number().optional(),
  }),
  z.object({
    type: z.literal("error"),
    error: z.string(),
    retryable: z.boolean().optional(),
  }),
]);

export type AgentStreamEvent = z.infer<typeof agentStreamEventSchema>;
