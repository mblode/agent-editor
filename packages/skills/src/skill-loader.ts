import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "../skills");

export interface SkillMeta {
  name: string;
  title: string;
  description: string;
  filePath: string;
}

export class SkillLoader {
  private cache = new Map<string, string>();

  async list(): Promise<SkillMeta[]> {
    const files = await readdir(SKILLS_DIR);
    const markdownFiles = files.filter((f) => f.endsWith(".md"));

    return Promise.all(
      markdownFiles.map(async (file) => {
        const name = file.replace(".md", "");
        const content = await this.load(name);
        const title = this.extractTitle(content);
        const description = this.extractDescription(content);
        return { name, title, description, filePath: join(SKILLS_DIR, file) };
      })
    );
  }

  async load(skillName: string): Promise<string> {
    if (this.cache.has(skillName)) {
      return this.cache.get(skillName)!;
    }

    const filePath = join(SKILLS_DIR, `${skillName}.md`);
    const content = await readFile(filePath, "utf-8");
    this.cache.set(skillName, content);
    return content;
  }

  async loadMany(skillNames: string[]): Promise<string[]> {
    return Promise.all(skillNames.map((name) => this.load(name)));
  }

  clearCache(): void {
    this.cache.clear();
  }

  private extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim() ?? "Unnamed Skill";
  }

  private extractDescription(content: string): string {
    // First paragraph after the title
    const lines = content.split("\n");
    let inParagraph = false;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        inParagraph = true;
        continue;
      }
      if (inParagraph && line.trim() && !line.startsWith("#")) {
        return line.trim();
      }
    }

    return "";
  }
}
