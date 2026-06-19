/** Domain types shared across the chat feature. */

export type Role = 'user' | 'assistant' | 'system';

export interface Chat {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  chat_id: string;
  role: Role;
  content: string;
  created_at: number;
  /** True for messages queued for sending (not yet dispatched). */
  queued?: boolean;
}

/** Chat row enriched with a last-message preview for list screens. */
export interface ChatWithPreview extends Chat {
  last_message?: string;
  last_role?: Role;
  message_count?: number;
}

/** Shape sent to OpenRouter's chat completions endpoint. */
export interface ApiMessage {
  role: Role;
  content: string;
}

/** Result of a streaming completion. */
export type CompletionResult = 'success' | 'stopped' | 'error';

/** Error surfaced to the UI from a streaming/completion failure. */
export interface StreamError {
  message: string;
  status?: number;
  code?: 'auth' | 'rate_limit' | 'credits' | 'network' | 'server' | 'aborted' | 'unknown';
  partial?: string;
}
