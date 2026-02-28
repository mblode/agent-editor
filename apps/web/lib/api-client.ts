const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiClientOptions {
  workspaceId?: string;
}

export class ApiClient {
  private headers: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.headers = {
      "Content-Type": "application/json",
      ...(options.workspaceId
        ? { "X-Workspace-ID": options.workspaceId }
        : {}),
    };
  }

  async createSession(body: {
    pageId?: string;
    skillNames?: string[];
    useSandbox?: boolean;
    maxTurns?: number;
  }): Promise<{ sessionId: string; streamUrl: string }> {
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to create session");
    }

    return res.json();
  }

  async sendMessage(
    sessionId: string,
    content: string
  ): Promise<{ streamUrl: string }> {
    // Returns the SSE stream URL for this message
    return {
      streamUrl: `${API_BASE}/api/sessions/${sessionId}/messages`,
    };
  }

  getStreamUrl(sessionId: string, prompt?: string): string {
    const url = new URL(
      `${API_BASE}/api/sessions/${sessionId}/stream`
    );
    if (prompt) url.searchParams.set("prompt", prompt);
    return url.toString();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async createCheckpoint(
    sessionId: string,
    label?: string
  ): Promise<{ id: string }> {
    const res = await fetch(
      `${API_BASE}/api/sessions/${sessionId}/checkpoint`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ label }),
      }
    );
    return res.json();
  }

  async listSkills(): Promise<
    Array<{ name: string; title: string; description: string }>
  > {
    const res = await fetch(`${API_BASE}/api/skills`, {
      headers: this.headers,
    });
    return res.json();
  }
}

// Singleton for use in hooks
export const apiClient = new ApiClient();
