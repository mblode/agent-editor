import { AgentRunner, createDestructiveCommandBlocker } from "@agent-editor/agent-sdk";
import type { AgentRunOptions } from "@agent-editor/agent-sdk";
import type { AgentStreamEvent } from "@agent-editor/schemas";

export class AgentService {
  private runner = new AgentRunner();
  private destructiveBlocker = createDestructiveCommandBlocker();

  /**
   * Run an agent session and stream typed events.
   * Automatically applies the destructive command blocker hook.
   */
  async *run(options: AgentRunOptions): AsyncGenerator<AgentStreamEvent> {
    yield* this.runner.run({
      ...options,
      preToolUseHooks: [this.destructiveBlocker],
    });
  }
}
