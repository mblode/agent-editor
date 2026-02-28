"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type {
  AgentMessage,
  AgentSessionStatus,
  AgentStreamEvent,
} from "@/types/agent";

interface UseAgentSessionOptions {
  skillNames?: string[];
  onMutation?: (data: unknown) => void;
  onAnalysis?: (data: unknown) => void;
}

interface UseAgentSessionReturn {
  messages: AgentMessage[];
  status: AgentSessionStatus;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  endSession: () => Promise<void>;
  createCheckpoint: (label?: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAgentSession(
  options: UseAgentSessionOptions = {}
): UseAgentSessionReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<AgentSessionStatus>("idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);

  // Stable refs so connectStream doesn't need to re-capture option callbacks
  const onMutationRef = useRef(options.onMutation);
  const onAnalysisRef = useRef(options.onAnalysis);
  const skillNamesRef = useRef(options.skillNames);

  useEffect(() => {
    onMutationRef.current = options.onMutation;
    onAnalysisRef.current = options.onAnalysis;
    skillNamesRef.current = options.skillNames;
  });

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      closeEventSource();
    };
  }, [closeEventSource]);

  const addMessage = useCallback((msg: Omit<AgentMessage, "id">) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  }, []);

  const appendToStreamingMessage = useCallback(
    (id: string, text: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id
            ? { ...msg, content: msg.content + text }
            : msg
        )
      );
    },
    []
  );

  const finishStreamingMessage = useCallback(() => {
    setIsStreaming(false);
    if (streamingMsgIdRef.current) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMsgIdRef.current
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
    }
  }, []);

  const connectStream = useCallback(
    (streamUrl: string) => {
      closeEventSource();

      const streamingMsgId = addMessage({
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      });
      streamingMsgIdRef.current = streamingMsgId;
      setIsStreaming(true);

      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (e: MessageEvent<string>) => {
        const event: AgentStreamEvent = JSON.parse(e.data);

        switch (event.type) {
          case "message": {
            if (event.role === "assistant" && event.content) {
              for (const block of event.content) {
                if (block.type === "text" && streamingMsgIdRef.current) {
                  appendToStreamingMessage(
                    streamingMsgIdRef.current,
                    block.text
                  );
                }
              }
            }
            break;
          }

          case "tool_call": {
            addMessage({
              role: "tool",
              content: `Using ${event.toolName}`,
              toolName: event.toolName,
              timestamp: new Date(),
            });
            break;
          }

          case "agent_action": {
            if (event.actionType === "mutation") {
              onMutationRef.current?.(event.data);
            } else if (event.actionType === "analysis") {
              onAnalysisRef.current?.(event.data);
            }
            break;
          }

          case "error": {
            setError(event.error ?? "Unknown error");
            finishStreamingMessage();
            eventSource.close();
            break;
          }

          case "done": {
            finishStreamingMessage();
            eventSource.close();
            break;
          }
        }
      };

      eventSource.onerror = () => {
        setIsStreaming(false);
        setError("Connection lost. Please try again.");
        eventSource.close();
      };
    },
    [closeEventSource, addMessage, appendToStreamingMessage, finishStreamingMessage]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);

      addMessage({
        role: "user",
        content,
        timestamp: new Date(),
      });

      // Create session on first message
      if (!sessionIdRef.current) {
        const { sessionId } = await apiClient.createSession({
          skillNames: skillNamesRef.current ?? ["linktree-editor", "structured-output"],
        });
        sessionIdRef.current = sessionId;
        setStatus("active");
      }

      const streamUrl = apiClient.getStreamUrl(sessionIdRef.current, content);
      connectStream(streamUrl);
    },
    [addMessage, connectStream]
  );

  const endSession = useCallback(async () => {
    closeEventSource();

    if (sessionIdRef.current) {
      await apiClient.deleteSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }

    setStatus("idle");
    setIsStreaming(false);
  }, [closeEventSource]);

  const createCheckpoint = useCallback(async (label?: string) => {
    if (!sessionIdRef.current) return;
    await apiClient.createCheckpoint(sessionIdRef.current, label);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    status,
    isStreaming,
    error,
    sendMessage,
    endSession,
    createCheckpoint,
    clearMessages,
  };
}
