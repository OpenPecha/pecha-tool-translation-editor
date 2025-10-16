export interface ChatMessage {
  id: string;
  type: 'user' | 'system' | 'error' | 'command-response';
  content: string;
  timestamp: Date;
  command?: string;
  status?: 'pending' | 'completed' | 'error';
  metadata?: Record<string, unknown>;
  actions?: { label: string; action: string }[];
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export interface ChatCommand {
  name: string;
  description: string;
  execute: () => Promise<CommandResult>;
}

export interface ChatState {
  messages: ChatMessage[];
  isProcessingCommand: boolean;
  lastCommandResult?: CommandResult;
}

export type ChatMessageType = ChatMessage['type'];
export type ChatMessageStatus = ChatMessage['status'];

// Available commands
export const AVAILABLE_COMMANDS = ['translate', 'glossary'] as const;
export type AvailableCommand = typeof AVAILABLE_COMMANDS[number];

// Command execution context
export interface CommandContext {
  selectedText: string | null;
  activeEditor: string | null;
  translationResults: unknown[];
  glossaryTerms: unknown[];
}
