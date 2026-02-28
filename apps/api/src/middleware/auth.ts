import type { Context, Next } from "hono";
import { db } from "../db/index.js";
import { workspaces } from "../db/schema.js";
import { env } from "../env.js";
import { decrypt } from "../services/crypto.service.js";
import { eq } from "drizzle-orm";

declare module "hono" {
  interface ContextVariableMap {
    workspaceId: string;
    anthropicKey: string;
  }
}

/**
 * Auth middleware:
 * 1. Extracts X-Workspace-ID from headers (or uses "default" workspace)
 * 2. Looks up workspace and decrypts its stored Anthropic API key
 * 3. Falls back to the org-level ANTHROPIC_API_KEY env var
 *
 * For Linktree's internal use, there's typically one workspace with the
 * org-level key. For BYOK SaaS, each workspace stores an encrypted key.
 */
export async function authMiddleware(c: Context, next: Next) {
  const workspaceId = c.req.header("X-Workspace-ID") ?? "default";

  let anthropicKey = env.ANTHROPIC_API_KEY;

  // Try to get workspace-specific key
  try {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (workspace?.encryptedAnthropicKey) {
      anthropicKey = decrypt(workspace.encryptedAnthropicKey, env.ENCRYPTION_KEY);
    }
  } catch {
    // Fall back to org-level key silently
  }

  c.set("workspaceId", workspaceId);
  c.set("anthropicKey", anthropicKey);

  await next();
}
