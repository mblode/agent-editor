import { SkillLoader } from "./skill-loader.js";

export interface SkillContext {
  PAGE_CONTEXT?: string;
  USER_NAME?: string;
  WORKSPACE_ID?: string;
  [key: string]: string | undefined;
}

export class SkillInjector {
  private loader: SkillLoader;

  constructor(loader?: SkillLoader) {
    this.loader = loader ?? new SkillLoader();
  }

  /**
   * Build a combined system prompt from multiple skills with context injection.
   *
   * Template variables like {{PAGE_CONTEXT}} in skill files are replaced with
   * values from the context object.
   */
  async buildSystemPrompt(
    skillNames: string[],
    context: SkillContext = {}
  ): Promise<string> {
    const skills = await this.loader.loadMany(skillNames);

    const combined = skills
      .map((content) => this.injectContext(content, context))
      .join("\n\n---\n\n");

    return combined;
  }

  private injectContext(content: string, context: SkillContext): string {
    let result = content;

    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) {
        result = result.replaceAll(`{{${key}}}`, value);
      }
    }

    // Remove any unreplaced template variables to keep the prompt clean
    result = result.replaceAll(/\{\{[A-Z_]+\}\}/g, "[not available]");

    return result;
  }
}
