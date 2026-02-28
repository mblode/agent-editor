import type { AgentStreamEvent } from "@agent-editor/schemas";

export type { AgentStreamEvent };

export interface AgentRunOptions {
  prompt: string;
  sessionId?: string;
  systemPrompt?: string;
  anthropicApiKey: string;
  allowedTools?: string[];
  maxTurns?: number;
  permissionMode?: "auto" | "strict" | "permissive";
  preToolUseHooks?: PreToolUseHook[];
  postToolUseHooks?: PostToolUseHook[];
}

export interface PreToolUseContext {
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface PostToolUseContext {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult: unknown;
}

export type PreToolUseHookResult =
  | { decision: "allow" }
  | { decision: "block"; reason: string };

export type PreToolUseHook = (
  ctx: PreToolUseContext
) => Promise<PreToolUseHookResult | void>;

export type PostToolUseHook = (ctx: PostToolUseContext) => Promise<void>;

export interface SessionInfo {
  sessionId: string;
  createdAt: Date;
  turnsUsed: number;
  tokensUsed: number;
}
