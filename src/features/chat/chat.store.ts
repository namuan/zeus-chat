import { create } from 'zustand';

import { listChats } from '@/db/chat.repo';
import type { Chat, ChatWithPreview, Message, StreamError } from '@/features/chat/chat.types';
import { estimateTokens } from '@/lib/tokenizer';

/**
 * Two concerns in one store (per TECH.md's chat.store):
 * 1. The chats list (for the Chats tab).
 * 2. The currently-open chat session: persisted messages + ephemeral
 *    streaming state that is NEVER written to SQLite mid-stream.
 */
interface ChatState {
  // --- chats list ---
  chats: ChatWithPreview[];
  reloadChats: () => Promise<void>;
  setChats: (chats: ChatWithPreview[]) => void;

  // --- active session ---
  activeChatId: string | null;
  activeChat: Chat | null;
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  error: StreamError | null;

  /** Running token totals for the current conversation. */
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;

  loadActive: (chat: Chat, messages: Message[]) => void;
  clearActive: () => void;
  addMessage: (m: Message) => void;
  updateMessageContent: (id: string, content: string) => void;
  removeMessage: (id: string) => void;

  setStreamingText: (t: string) => void;
  appendStreamingToken: (t: string) => void;
  setStreaming: (v: boolean) => void;
  setError: (e: StreamError | null) => void;

  // --- suggestions ---
  suggestions: string[];
  suggestionsLoading: boolean;
  setSuggestions: (s: string[]) => void;
  setSuggestionsLoading: (v: boolean) => void;
  clearSuggestions: () => void;

  // --- message queue ---
  queuedMessages: string[];
  enqueueMessage: (text: string) => void;
  dequeueMessage: () => string | undefined;
  peekQueue: () => string | undefined;
  removeQueuedMessage: (index: number) => void;
  clearQueue: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],

  reloadChats: async () => {
    const chats = await listChats();
    set({ chats });
  },
  setChats: (chats) => set({ chats }),

  activeChatId: null,
  activeChat: null,
  messages: [],
  streamingText: '',
  isStreaming: false,
  error: null,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 0,

  loadActive: (chat, messages) =>
    set({
      activeChatId: chat.id,
      activeChat: chat,
      messages,
      streamingText: '',
      isStreaming: false,
      error: null,
      ...computeTokenTotals(messages),
    }),

  clearActive: () =>
    set({
      activeChatId: null,
      activeChat: null,
      messages: [],
      streamingText: '',
      isStreaming: false,
      error: null,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      suggestions: [],
      suggestionsLoading: false,
      queuedMessages: [],
    }),

  addMessage: (m) =>
    set((s) => {
      const messages = [...s.messages, m];
      // If the new message has explicit token data, use it; otherwise estimate.
      let deltaPrompt = 0;
      let deltaCompletion = 0;
      let deltaTotal = 0;
      if (m.total_tokens != null) {
        deltaPrompt = m.prompt_tokens ?? 0;
        deltaCompletion = m.completion_tokens ?? 0;
        deltaTotal = m.total_tokens;
      } else if (m.role === 'assistant') {
        deltaCompletion = estimateTokens(m.content);
        deltaTotal = deltaCompletion;
      } else if (m.role === 'user') {
        deltaPrompt = estimateTokens(m.content);
        deltaTotal = deltaPrompt;
      }
      return {
        messages,
        totalPromptTokens: s.totalPromptTokens + deltaPrompt,
        totalCompletionTokens: s.totalCompletionTokens + deltaCompletion,
        totalTokens: s.totalTokens + deltaTotal,
      };
    }),
  updateMessageContent: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),
  removeMessage: (id) =>
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),

  setStreamingText: (t) => set({ streamingText: t }),
  appendStreamingToken: (t) =>
    set((s) => ({ streamingText: s.streamingText + t })),
  setStreaming: (v) => set({ isStreaming: v }),
  setError: (e) => set({ error: e }),

  // --- suggestions ---
  suggestions: [],
  suggestionsLoading: false,
  setSuggestions: (suggestions) => set({ suggestions, suggestionsLoading: false }),
  setSuggestionsLoading: (suggestionsLoading) => set({ suggestionsLoading }),
  clearSuggestions: () => set({ suggestions: [], suggestionsLoading: false }),

  // --- message queue ---
  queuedMessages: [],
  enqueueMessage: (text) =>
    set((s) => ({ queuedMessages: [...s.queuedMessages, text] })),
  dequeueMessage: () => {
    const { queuedMessages } = get();
    if (queuedMessages.length === 0) return undefined;
    const [first, ...rest] = queuedMessages;
    set({ queuedMessages: rest });
    return first;
  },
  peekQueue: () => {
    const { queuedMessages } = get();
    return queuedMessages.length > 0 ? queuedMessages[0] : undefined;
  },
  removeQueuedMessage: (index) =>
    set((s) => ({
      queuedMessages: s.queuedMessages.filter((_, i) => i !== index),
    })),
  clearQueue: () => set({ queuedMessages: [] }),
}));

/** Sum token totals across an array of messages, falling back to estimation. */
function computeTokenTotals(messages: Message[]) {
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  for (const m of messages) {
    if (m.total_tokens != null) {
      // Use provider-reported data if available.
      totalPromptTokens += m.prompt_tokens ?? 0;
      totalCompletionTokens += m.completion_tokens ?? 0;
      totalTokens += m.total_tokens;
    } else {
      // Fall back to client-side estimation.
      const estimated = estimateTokens(m.content);
      if (m.role === 'assistant') {
        totalCompletionTokens += estimated;
      } else {
        totalPromptTokens += estimated;
      }
      totalTokens += estimated;
    }
  }

  return { totalPromptTokens, totalCompletionTokens, totalTokens };
}

/** Selector helper: the messages to render, with a trailing streaming bubble. */
export function selectDisplayMessages(state: ChatState): (Message & { streaming?: boolean })[] {
  const base = state.messages as (Message & { streaming?: boolean })[];
  if (state.isStreaming) {
    return [
      ...base,
      {
        id: '__streaming__',
        chat_id: state.activeChatId ?? '',
        role: 'assistant',
        content: state.streamingText,
        created_at: Date.now(),
        streaming: true,
      },
    ];
  }
  return base;
}
