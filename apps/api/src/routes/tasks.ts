import { zValidator } from "@hono/zod-validator";
import { oneOffTaskSchema, agentResponseSchema } from "@agent-editor/schemas";
import { StructuredAgent } from "@agent-editor/agent-sdk";
import { Hono } from "hono";
import { SkillsService } from "../services/skills.service.js";

const skillsService = new SkillsService();

const taskPrompts: Record<string, string> = {
  analyze:
    "Analyze this Linktree page and provide actionable insights to improve engagement and CTR. Focus on link titles, structure, and missing opportunities.",
  rename_titles:
    "Suggest improved titles for each link on this page. Make them more action-oriented, clear, and clickable. Return mutations with the updated titles.",
  suggest_theme:
    "Based on this creator's content and profile, suggest the best visual theme (colors, button style, font) for their Linktree page.",
  optimize_links:
    "Review all links and suggest reordering, grouping, or restructuring to maximize engagement. The most important links should be at the top.",
  generate_bio:
    "Write a compelling bio for this creator based on their profile and link content. Keep it under 150 characters.",
};

export const tasksRouter = new Hono();

// POST /api/tasks — Run a one-shot structured task
tasksRouter.post("/", zValidator("json", oneOffTaskSchema), async (c) => {
  const body = c.req.valid("json");
  const anthropicKey = c.get("anthropicKey");
  const workspaceId = c.get("workspaceId");

  const prompt = taskPrompts[body.taskType];
  if (!prompt) {
    return c.json({ error: `Unknown task type: ${body.taskType}` }, 400);
  }

  const systemPrompt = await skillsService.buildSystemPrompt(
    [body.skillName, "structured-output"],
    {
      pageSnapshot: body.pageData,
      workspaceId,
    }
  );

  const agent = new StructuredAgent(agentResponseSchema);

  try {
    const result = await agent.run({
      prompt,
      systemPrompt,
      anthropicApiKey: anthropicKey,
      maxTurns: body.maxTurns,
      allowedTools: [],
    });

    return c.json(result);
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Task execution failed",
      },
      500
    );
  }
});
