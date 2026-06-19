import type { StreamError } from '@/features/chat/chat.types';

/** Configuration for a single AI provider. */
export interface ProviderConfig {
  /** Unique identifier, e.g. 'openrouter' or 'requesty'. */
  id: string;
  /** Human-readable name, e.g. 'OpenRouter' or 'Requesty'. */
  name: string;
  /** POST endpoint for chat completions. */
  apiUrl: string;
  /** Web page where users can obtain an API key. */
  keysUrl: string;
  /** Default model ID to use when none has been set yet. */
  defaultModel: string;
  /** Placeholder text for the API key input field. */
  apiKeyPlaceholder: string;
  /** Build HTTP headers for a request with the given API key. */
  buildHeaders: (apiKey: string) => Record<string, string>;
  /** Optional: override the default model placeholder in the settings UI. */
  modelPlaceholder?: string;
  /** Optional: override the model hint text in the settings UI. */
  modelHint?: string;
}

export interface StreamChatArgs {
  messages: { role: string; content: string }[];
  model?: string;
  onToken: (token: string) => void;
  signal: AbortSignal;
  apiKey: string;
  provider: ProviderConfig;
}

export interface CompletionArgs {
  messages: { role: string; content: string }[];
  model?: string;
  signal?: AbortSignal;
  maxTokens?: number;
  apiKey: string;
  provider: ProviderConfig;
}

export type ValidateKeyResult =
  | { ok: true }
  | { ok: false; error: StreamError };
