import type { z } from "zod";
import { AgentRunner } from "./agent-runner.js";
import type { AgentRunOptions } from "./types.js";

/**
 * StructuredAgent wraps AgentRunner and enforces a Zod schema on the output.
 *
 * Usage:
 * ```ts
 * const agent = new StructuredAgent(agentResponseSchema);
 * const result = await agent.run({ prompt: "Rename my links", ...options });
 * // result is typed as AgentResponse
 * ```
 *
 * The agent will retry up to maxRetries times if the output is invalid JSON
 * or doesn't match the schema, feeding the validation error back to the model.
 */
export class StructuredAgent<TSchema extends z.ZodType> {
  private runner = new AgentRunner();

  constructor(
    private readonly schema: TSchema,
    private readonly maxRetries = 3
  ) {}

  async run(options: AgentRunOptions): Promise<z.infer<TSchema>> {
    const jsonInstructions = this.buildJsonInstructions();
    const augmentedOptions: AgentRunOptions = {
      ...options,
      systemPrompt: options.systemPrompt
        ? `${options.systemPrompt}\n\n${jsonInstructions}`
        : jsonInstructions,
    };

    let lastError: string | null = null;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      const textParts: string[] = [];

      // Include error feedback on retry
      const prompt =
        attempt > 0 && lastError
          ? `${options.prompt}\n\nYour previous response was invalid. Error: ${lastError}\nPlease respond with valid JSON matching the schema.`
          : options.prompt;

      for await (const event of this.runner.run({
        ...augmentedOptions,
        prompt,
      })) {
        if (event.type === "message" && event.role === "assistant") {
          for (const block of event.content) {
            if (block.type === "text") {
              textParts.push(block.text);
            }
          }
        }

        if (event.type === "error") {
          throw new Error(`Agent error: ${event.error}`);
        }
      }

      const fullText = textParts.join("");
      const extracted = this.extractJson(fullText);

      if (extracted !== null) {
        const result = this.schema.safeParse(extracted);
        if (result.success) return result.data;
        lastError = JSON.stringify(result.error.flatten(), null, 2);
      } else {
        lastError = "Response did not contain a valid JSON object";
      }

      attempt++;
    }

    throw new Error(
      `StructuredAgent failed after ${this.maxRetries} attempts. Last error: ${lastError}`
    );
  }

  private extractJson(text: string): unknown {
    // Try code fence first: ```json ... ```
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch?.[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // fall through
      }
    }

    // Try raw outermost JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // fall through
      }
    }

    return null;
  }

  private buildJsonInstructions(): string {
    return `
## Output Format

You MUST respond ONLY with a JSON object wrapped in a \`\`\`json code block.
Do not include any prose before or after the JSON block.

Required schema (TypeScript types for reference):
\`\`\`json
${JSON.stringify((this.schema as unknown as { _def: unknown })._def, null, 2)}
\`\`\`

Example response format:
\`\`\`json
{ "type": "...", "data": { ... } }
\`\`\`
`.trim();
  }
}
