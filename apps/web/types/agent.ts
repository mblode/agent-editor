export type AgentSessionStatus = "idle" | "active" | "ended" | "error";

export interface AgentTextBlock {
  type: "text";
  text: string;
}

export interface AgentToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

export type AgentContentBlock = AgentTextBlock | AgentToolUseBlock;

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  contentBlocks?: AgentContentBlock[];
  toolName?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AgentSession {
  sessionId: string;
  status: AgentSessionStatus;
  streamUrl: string;
}

export interface AgentStreamEvent {
  type:
    | "message"
    | "tool_call"
    | "tool_result"
    | "agent_action"
    | "system"
    | "done"
    | "error";
  role?: "assistant" | "user";
  content?: AgentContentBlock[];
  toolName?: string;
  toolInput?: Record<string, unknown>;
  result?: unknown;
  actionType?: "mutation" | "analysis";
  data?: unknown;
  subtype?: string;
  sessionId?: string;
  turnsUsed?: number;
  tokensUsed?: number;
  error?: string;
  retryable?: boolean;
}
