import { SkillInjector, SkillLoader } from "@agent-editor/skills";
import type { SkillMeta } from "@agent-editor/skills";

interface PageSnapshot {
  profile?: {
    username: string;
    displayName?: string;
    bio?: string;
  };
  blocks: Array<{
    id: string;
    type: string;
    title: string;
    url?: string;
    position: number;
    isActive?: boolean;
  }>;
}

export class SkillsService {
  private loader = new SkillLoader();
  private injector = new SkillInjector(this.loader);

  async list(): Promise<SkillMeta[]> {
    return this.loader.list();
  }

  async getContent(skillName: string): Promise<string> {
    return this.loader.load(skillName);
  }

  /**
   * Build a system prompt from skill files with live page context injected.
   */
  async buildSystemPrompt(
    skillNames: string[],
    options: {
      pageSnapshot?: PageSnapshot;
      workspaceId?: string;
    } = {}
  ): Promise<string> {
    const context: Record<string, string> = {};

    if (options.pageSnapshot) {
      context.PAGE_CONTEXT = JSON.stringify(options.pageSnapshot, null, 2);
    }

    if (options.workspaceId) {
      context.WORKSPACE_ID = options.workspaceId;
    }

    return this.injector.buildSystemPrompt(skillNames, context);
  }
}
