import { z } from "zod";

export const blockTypeSchema = z.enum([
  "CLASSIC",
  "GROUP",
  "HEADER",
  "SPOTIFY_PLAYLIST",
  "SPOTIFY_TRACK",
  "SPOTIFY_ALBUM",
  "SOCIAL",
  "EMBED",
]);

export const blockMutationSchema = z.object({
  id: z.string().optional(),
  type: blockTypeSchema.optional(),
  title: z.string(),
  url: z.string().url().optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
});

export const agentBlockMutationSchema = z.object({
  action: z.enum(["create", "update", "delete", "reorder", "noop"]),
  blocks: z.array(blockMutationSchema),
  explanation: z.string(),
  preview: z.string().optional(),
  requiresConfirmation: z.boolean().default(false),
});

export const agentInsightSchema = z.object({
  type: z.enum(["warning", "suggestion", "info"]),
  message: z.string(),
  blockId: z.string().optional(),
});

export const agentAnalysisSchema = z.object({
  insights: z.array(agentInsightSchema),
  score: z.number().min(0).max(100).optional(),
  summary: z.string(),
});

export const agentResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mutation"), data: agentBlockMutationSchema }),
  z.object({ type: z.literal("analysis"), data: agentAnalysisSchema }),
  z.object({
    type: z.literal("message"),
    data: z.object({ content: z.string() }),
  }),
]);

export type BlockType = z.infer<typeof blockTypeSchema>;
export type BlockMutation = z.infer<typeof blockMutationSchema>;
export type AgentBlockMutation = z.infer<typeof agentBlockMutationSchema>;
export type AgentAnalysis = z.infer<typeof agentAnalysisSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
