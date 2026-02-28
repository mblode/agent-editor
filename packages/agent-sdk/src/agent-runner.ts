import type { AgentStreamEvent } from "@agent-editor/schemas";
import type { AgentRunOptions } from "./types.js";

// The Claude Code SDK is imported dynamically to allow for graceful degradation
// in environments where it isn't available, and to keep the type import clean.
// Package: @anthropic-ai/claude-code (the programmatic SDK, not the CLI)

export class AgentRunner {
  /**
   * Run an agent session and stream typed events.
   *
   * Uses the @anthropic-ai/claude-code SDK's `query()` function which provides:
   * - Typed SDKMessage async generator (no stdout parsing)
   * - Session resumption via `resume: sessionId`
   * - Programmatic hooks for permission gates and audit logging
   * - BYOK API key injection via `env: { ANTHROPIC_API_KEY }`
   * - Cost controls via `maxTurns`
   */
  async *run(options: AgentRunOptions): AsyncGenerator<AgentStreamEvent> {
    const {
      prompt,
      sessionId,
      systemPrompt,
      anthropicApiKey,
      allowedTools = ["Read", "Write", "Bash", "Glob", "Grep"],
      maxTurns = 10,
    } = options;

    try {
      // Dynamically import to avoid build-time issues if SDK not installed
      const { query } = await import("@anthropic-ai/claude-code");

      let capturedSessionId: string | undefined;
      let turnsUsed = 0;

      for await (const message of query({
        prompt,
        options: {
          ...(sessionId ? { resume: sessionId } : {}),
          systemPrompt,
          maxTurns,
          allowedTools,
          permissionMode: "bypassPermissions",
          env: {
            ANTHROPIC_API_KEY: anthropicApiKey,
          },
        },
      })) {
        const event = this.normalizeMessage(message);

        if (event) {
          // Capture session ID from init event
          if (
            event.type === "system" &&
            event.subtype === "init" &&
            event.sessionId
          ) {
            capturedSessionId = event.sessionId;
          }

          if (event.type === "done") {
            yield {
              ...event,
              turnsUsed,
            };
          } else {
            yield event;
          }
        }

        turnsUsed++;
      }

      // Emit done if not already emitted
      yield { type: "done", turnsUsed };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("rate_limit") ||
        message.includes("overloaded") ||
        message.includes("timeout");

      yield { type: "error", error: message, retryable };
    }
  }

  private normalizeMessage(message: unknown): AgentStreamEvent | null {
    if (!message || typeof message !== "object") return null;

    const msg = message as Record<string, unknown>;

    switch (msg.type) {
      case "assistant": {
        const inner = msg.message as Record<string, unknown>;
        return {
          type: "message",
          role: "assistant",
          content: (inner?.content as AgentStreamEvent & { type: "message" }["content"]) ?? [],
        };
      }

      case "user": {
        const inner = msg.message as Record<string, unknown>;
        return {
          type: "message",
          role: "user",
          content: (inner?.content as AgentStreamEvent & { type: "message" }["content"]) ?? [],
        };
      }

      case "tool_use":
        return {
          type: "tool_call",
          toolName: String(msg.toolName ?? ""),
          toolInput: (msg.toolInput as Record<string, unknown>) ?? {},
          id: msg.id ? String(msg.id) : undefined,
        };

      case "tool_result":
        return {
          type: "tool_result",
          toolName: String(msg.toolName ?? ""),
          result: msg.result,
          id: msg.id ? String(msg.id) : undefined,
        };

      case "system":
        return {
          type: "system",
          subtype: String(msg.subtype ?? ""),
          sessionId: msg.session_id ? String(msg.session_id) : undefined,
        };

      default:
        return null;
    }
  }
}
