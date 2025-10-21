import { useCallback, useState } from "react";
import type {
  ChatMessage,
  ChatMessageStatus,
  ChatMessageType,
} from "../types/chatTypes";

export const useChatHistory = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = useCallback(
    (
      type: ChatMessageType,
      content: string,
      options?: {
        command?: string;
        status?: ChatMessageStatus;
        metadata?: Record<string, unknown>;
        actions?: { label: string; action: string }[];
      }
    ): string => {
      const messageId = `msg-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 11)}`;

      const newMessage: ChatMessage = {
        id: messageId,
        type,
        content,
        timestamp: new Date(),
        command: options?.command,
        status: options?.status,
        metadata: options?.metadata,
      };

      setMessages((prev) => [...prev, newMessage]);
      return messageId;
    },
    []
  );

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
      );
    },
    []
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  const getLastMessage = useCallback((): ChatMessage | undefined => {
    return messages[messages.length - 1];
  }, [messages]);

  const getMessagesByType = useCallback(
    (type: ChatMessageType): ChatMessage[] => {
      return messages.filter((msg) => msg.type === type);
    },
    [messages]
  );

  const getMessagesWithCommand = useCallback(
    (command: string): ChatMessage[] => {
      return messages.filter((msg) => msg.command === command);
    },
    [messages]
  );

  return {
    messages,
    addMessage,
    updateMessage,
    clearHistory,
    getLastMessage,
    getMessagesByType,
    getMessagesWithCommand,
    messageCount: messages.length,
  };
};
