import type { env as AppEnv } from "../env.js";

export interface SandboxSession {
  sessionId: string;
  provider: "sprites" | "docker" | "none";
  providerId: string;
  createdAt: Date;
}

interface SandboxConfig {
  provider: "sprites" | "docker" | "none";
  spritesToken?: string;
  dockerSocketPath?: string;
}

/**
 * SandboxService manages isolated execution environments for agent sessions.
 *
 * Supports two backends:
 * - Sprites.dev (production): Firecracker microVMs, persistent state, checkpoint/restore
 * - Docker (local dev): standard containers with optional checkpoint via experimental daemon
 * - None (testing): no-op sandbox for development without container tooling
 */
export class SandboxService {
  private sessions = new Map<string, SandboxSession>();
  private dockerClient: unknown | null = null;

  constructor(private config: SandboxConfig) {
    if (config.provider === "sprites" && !config.spritesToken) {
      throw new Error("spritesToken is required when provider is 'sprites'");
    }
  }

  private async getDockerClient() {
    if (!this.dockerClient) {
      const Docker = (await import("dockerode")).default;
      this.dockerClient = new Docker({
        socketPath: this.config.dockerSocketPath ?? "/var/run/docker.sock",
      });
    }
    return this.dockerClient as InstanceType<typeof import("dockerode").default>;
  }

  static fromEnv(appEnv: typeof AppEnv): SandboxService {
    if (appEnv.SPRITES_TOKEN) {
      return new SandboxService({
        provider: "sprites",
        spritesToken: appEnv.SPRITES_TOKEN,
      });
    }

    if (appEnv.NODE_ENV === "development") {
      return new SandboxService({ provider: "none" });
    }

    return new SandboxService({ provider: "docker" });
  }

  async create(sessionId: string): Promise<SandboxSession> {
    let session: SandboxSession;

    switch (this.config.provider) {
      case "sprites":
        session = await this.createSprite(sessionId);
        break;
      case "docker":
        session = await this.createDocker(sessionId);
        break;
      default:
        session = {
          sessionId,
          provider: "none",
          providerId: `noop-${sessionId}`,
          createdAt: new Date(),
        };
    }

    this.sessions.set(sessionId, session);
    return session;
  }

  async checkpoint(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`No sandbox session for ${sessionId}`);

    switch (session.provider) {
      case "sprites":
        return this.checkpointSprite(session.providerId);
      case "docker":
        return this.checkpointDocker(session.providerId);
      default:
        return `noop-checkpoint-${Date.now()}`;
    }
  }

  async restore(sessionId: string, checkpointId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`No sandbox session for ${sessionId}`);

    switch (session.provider) {
      case "sprites":
        await this.restoreSprite(session.providerId, checkpointId);
        break;
      case "docker":
        await this.restoreDocker(session.providerId, checkpointId);
        break;
      default:
        break;
    }
  }

  async destroy(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (session.provider) {
      case "sprites":
        await this.destroySprite(session.providerId);
        break;
      case "docker":
        await this.destroyDocker(session.providerId);
        break;
      default:
        break;
    }

    this.sessions.delete(sessionId);
  }

  get(sessionId: string): SandboxSession | undefined {
    return this.sessions.get(sessionId);
  }

  // === Sprites.dev (production) ===

  private async createSprite(sessionId: string): Promise<SandboxSession> {
    const { SpritesClient } = await import("@fly/sprites");
    const client = new SpritesClient(this.config.spritesToken!);

    const spriteName = `agent-${sessionId.slice(0, 8)}`;
    await client.createSprite(spriteName);

    return {
      sessionId,
      provider: "sprites",
      providerId: spriteName,
      createdAt: new Date(),
    };
  }

  private async checkpointSprite(spriteName: string): Promise<string> {
    const response = await fetch(
      `https://api.sprites.dev/v1/sprites/${spriteName}/checkpoints`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.spritesToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to checkpoint sprite: ${response.statusText}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  private async restoreSprite(
    spriteName: string,
    checkpointId: string
  ): Promise<void> {
    const response = await fetch(
      `https://api.sprites.dev/v1/sprites/${spriteName}/checkpoints/${checkpointId}/restore`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.spritesToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to restore sprite: ${response.statusText}`);
    }
  }

  private async destroySprite(spriteName: string): Promise<void> {
    const response = await fetch(
      `https://api.sprites.dev/v1/sprites/${spriteName}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.config.spritesToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to destroy sprite: ${response.statusText}`);
    }
  }

  // === Docker (local dev) ===

  private async createDocker(sessionId: string): Promise<SandboxSession> {
    const docker = await this.getDockerClient();

    const container = await docker.createContainer({
      Image: "agent-editor-sandbox:latest",
      name: `agent-session-${sessionId.slice(0, 8)}`,
      HostConfig: {
        Memory: 512 * 1024 * 1024,
        AutoRemove: false,
      },
    });

    await container.start();

    return {
      sessionId,
      provider: "docker",
      providerId: container.id,
      createdAt: new Date(),
    };
  }

  private async checkpointDocker(containerId: string): Promise<string> {
    const checkpointId = `cp-${Date.now()}`;
    const docker = await this.getDockerClient();
    const container = docker.getContainer(containerId);
    await (container as unknown as { createCheckpoint: (opts: { checkpointID: string }) => Promise<void> }).createCheckpoint({ checkpointID: checkpointId });
    return checkpointId;
  }

  private async restoreDocker(
    containerId: string,
    checkpointId: string
  ): Promise<void> {
    const docker = await this.getDockerClient();
    const container = docker.getContainer(containerId);
    await container.start({ checkpoint: checkpointId } as Parameters<typeof container.start>[0]);
  }

  private async destroyDocker(containerId: string): Promise<void> {
    const docker = await this.getDockerClient();
    const container = docker.getContainer(containerId);
    try {
      await container.stop({ t: 5 });
    } catch {
      // Already stopped
    }
    await container.remove({ force: true });
  }
}
