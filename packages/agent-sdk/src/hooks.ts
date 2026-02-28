import type {
  PostToolUseContext,
  PostToolUseHook,
  PreToolUseContext,
  PreToolUseHook,
  PreToolUseHookResult,
} from "./types.js";

/**
 * Blocks destructive bash commands (rm -rf, DROP TABLE, etc.)
 * Use as a PreToolUse hook to prevent accidental data loss.
 */
export function createDestructiveCommandBlocker(): PreToolUseHook {
  const DESTRUCTIVE_PATTERNS = [
    /rm\s+-[rf]+/i,
    /DROP\s+TABLE/i,
    /DELETE\s+FROM/i,
    /TRUNCATE\s+TABLE/i,
    /format\s+[a-z]:/i,
    /mkfs/i,
    /dd\s+if=/i,
  ];

  return async (ctx: PreToolUseContext): Promise<PreToolUseHookResult | void> => {
    if (ctx.toolName !== "Bash") return;

    const command = String(ctx.toolInput.command ?? "");

    for (const pattern of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(command)) {
        return {
          decision: "block",
          reason: `Destructive command blocked: ${command}. Please confirm with the user before running destructive operations.`,
        };
      }
    }
  };
}

/**
 * Creates an audit log hook that records all tool calls to a callback.
 * Useful for compliance, debugging, and observability.
 */
export function createAuditLogHook(
  onLog: (entry: {
    toolName: string;
    toolInput: Record<string, unknown>;
    result: unknown;
    timestamp: Date;
  }) => Promise<void>
): PostToolUseHook {
  return async (ctx: PostToolUseContext): Promise<void> => {
    await onLog({
      toolName: ctx.toolName,
      toolInput: ctx.toolInput,
      result: ctx.toolResult,
      timestamp: new Date(),
    });
  };
}

/**
 * Creates a hook that requires confirmation before running specific tools.
 * The confirmFn should return true to allow, false to block.
 */
export function createConfirmationHook(
  confirmFn: (ctx: PreToolUseContext) => Promise<boolean>,
  toolNames: string[]
): PreToolUseHook {
  return async (ctx: PreToolUseContext): Promise<PreToolUseHookResult | void> => {
    if (!toolNames.includes(ctx.toolName)) return;

    const allowed = await confirmFn(ctx);
    if (!allowed) {
      return {
        decision: "block",
        reason: `User denied permission for ${ctx.toolName}`,
      };
    }
  };
}
