import { Hono } from "hono";
import { SkillsService } from "../services/skills.service.js";

const skillsService = new SkillsService();

export const skillsRouter = new Hono();

// GET /api/skills — List all available skills
skillsRouter.get("/", async (c) => {
  const skills = await skillsService.list();
  return c.json(skills);
});

// GET /api/skills/:name — Get skill content
skillsRouter.get("/:name", async (c) => {
  const name = c.req.param("name");

  try {
    const content = await skillsService.getContent(name);
    return c.json({ name, content });
  } catch {
    return c.json({ error: `Skill '${name}' not found` }, 404);
  }
});
