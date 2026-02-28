import { z } from "zod";

export const taskTypeSchema = z.enum([
  "analyze",
  "rename_titles",
  "suggest_theme",
  "optimize_links",
  "generate_bio",
]);

export const oneOffTaskSchema = z.object({
  pageData: z
    .object({
      profile: z
        .object({
          username: z.string(),
          displayName: z.string().optional(),
          bio: z.string().optional(),
        })
        .optional(),
      blocks: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          title: z.string(),
          url: z.string().optional(),
          position: z.number(),
          isActive: z.boolean().optional(),
        })
      ),
    })
    .optional(),
  taskType: taskTypeSchema,
  skillName: z.string().default("linktree-editor"),
  maxTurns: z.number().int().min(1).max(10).default(5),
});

export type TaskType = z.infer<typeof taskTypeSchema>;
export type OneOffTask = z.infer<typeof oneOffTaskSchema>;
