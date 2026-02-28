import { z } from "zod";

export const checkpointSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  sandboxCheckpointId: z.string(),
  label: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const createCheckpointSchema = z.object({
  label: z.string().max(100).optional(),
});

export type Checkpoint = z.infer<typeof checkpointSchema>;
export type CreateCheckpointInput = z.infer<typeof createCheckpointSchema>;
