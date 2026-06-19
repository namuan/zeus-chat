import { create } from 'zustand';

import { listChats } from '@/db/chat.repo';
import type { Chat, ChatWithPreview, Message, StreamError } from '@/features/chat/chat.types';

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

  loadActive: (chat: Chat, messages: Message[]) => void;
  clearActive: () => void;
  addMessage: (m: Message) => void;
  updateMessageContent: (id: string, content: string) => void;
  removeMessage: (id: string) => void;

  setStreamingText: (t: string) => void;
  appendStreamingToken: (t: string) => void;
  setStreaming: (v: boolean) => void;
  setError: (e: StreamError | null) => void;

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

  loadActive: (chat, messages) =>
    set({
      activeChatId: chat.id,
      activeChat: chat,
      messages,
      streamingText: '',
      isStreaming: false,
      error: null,
    }),

  clearActive: () =>
    set({
      activeChatId: null,
      activeChat: null,
      messages: [],
      streamingText: '',
      isStreaming: false,
      error: null,
      queuedMessages: [],
    }),

  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
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
