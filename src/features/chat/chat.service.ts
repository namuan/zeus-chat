import {
  createChat as repoCreateChat,
  deleteChat as repoDeleteChat,
  getChat,
  listChats as repoListChats,
  renameChat as repoRenameChat,
  touchChat,
} from '@/db/chat.repo';
import {
  deleteMessage as repoDeleteMessage,
  getLastAssistantMessage,
  getApiMessages,
  insertMessage,
  listMessages,
  updateMessageContent,
} from '@/db/message.repo';
import type {
  ApiMessage,
  Chat,
  CompletionResult,
  StreamError,
} from '@/features/chat/chat.types';
import { selectDisplayMessages, useChatStore } from '@/features/chat/chat.store';
import { streamChat } from '@/lib/openrouter';
import { abort, createController, isAbortError } from '@/utils/abortController';
import { now } from '@/utils/time';
import { useSettingsStore } from '@/features/settings/settings.store';

// ---------------------------------------------------------------------------
// Module-level streaming controller — replaces useStreaming.
// The service owns the AbortController so chained queue sends can be cancelled.
// ---------------------------------------------------------------------------
let _currentController: AbortController | null = null;

function createSendSignal(): AbortSignal {
  abort(_currentController);
  _currentController = createController();
  return _currentController.signal;
}

/** Cancel the current streaming request (if any). */
export function cancelStream(): void {
  abort(_currentController);
  _currentController = null;
}

/** Cancel stream + clear the message queue. Called on unmount / chat switch. */
export function cancelAndClear(): void {
  cancelStream();
  useChatStore.getState().clearQueue();
}

/** Derive a chat title from the first user message. */
function titleFromText(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New Chat';
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

/** Create a new chat and refresh the list. */
export async function createChat(): Promise<Chat> {
  const chat = await repoCreateChat('New Chat');
  await useChatStore.getState().reloadChats();
  return chat;
}

/** Load a chat + its messages into the active session. */
export async function loadChat(chatId: string): Promise<Chat | null> {
  const chat = await getChat(chatId);
  if (!chat) {
    useChatStore.getState().clearActive();
    return null;
  }
  const messages = await listMessages(chatId);
  useChatStore.getState().loadActive(chat, messages);
  return chat;
}

/** Rename a chat (persists + updates active session + list). */
export async function renameChat(chatId: string, title: string): Promise<void> {
  await repoRenameChat(chatId, title);
  const { activeChat, reloadChats } = useChatStore.getState();
  if (activeChat?.id === chatId) {
    useChatStore.setState({ activeChat: { ...activeChat, title } });
  }
  await reloadChats();
}

/** Delete a chat and clear the active session if it was open. */
export async function deleteChat(chatId: string): Promise<void> {
  await repoDeleteChat(chatId);
  const { activeChatId, clearActive, reloadChats } = useChatStore.getState();
  if (activeChatId === chatId) clearActive();
  await reloadChats();
}

/**
 * Core streaming completion shared by send + regenerate. Persists the
 * assistant message once at the end (never per-token, per TECH.md).
 */
async function runCompletion(chatId: string, signal: AbortSignal): Promise<CompletionResult> {
  const store = useChatStore.getState();
  const model = useSettingsStore.getState().model;

  store.setError(null);
  store.setStreaming(true);
  store.setStreamingText('');

  let apiMessages: ApiMessage[];
  try {
    apiMessages = await getApiMessages(chatId);
  } catch {
    store.setStreaming(false);
    store.setStreamingText('');
    store.setError({ code: 'unknown', message: 'Could not read chat history.' });
    return 'error';
  }

  let full = '';
  try {
    full = await streamChat({
      messages: apiMessages,
      model,
      onToken: (t) => useChatStore.getState().appendStreamingToken(t),
      signal,
    });
  } catch (err) {
    const partial = useChatStore.getState().streamingText;
    store.setStreaming(false);
    store.setStreamingText('');

    if (isAbortError(err)) {
      // Save whatever was generated so the conversation isn't lost.
      if (partial.trim()) {
        try {
          const msg = await insertMessage({ chat_id: chatId, role: 'assistant', content: partial });
          useChatStore.getState().addMessage(msg);
          await touchChat(chatId);
          await useChatStore.getState().reloadChats();
        } catch {
          /* ignore — can't persist the partial either */
        }
      }
      return 'stopped';
    }

    const e = err as StreamError;
    if (partial.trim()) {
      e.partial = partial;
      try {
        const msg = await insertMessage({ chat_id: chatId, role: 'assistant', content: partial });
        useChatStore.getState().addMessage(msg);
        await touchChat(chatId);
        await useChatStore.getState().reloadChats();
      } catch {
        /* ignore — already failing */
      }
    }
    store.setError(e);
    return 'error';
  }

  // Success: persist the full assistant message.
  const content = full || useChatStore.getState().streamingText || '';
  try {
    const msg = await insertMessage({ chat_id: chatId, role: 'assistant', content });
    useChatStore.getState().addMessage(msg);
    await touchChat(chatId);
    await useChatStore.getState().reloadChats();
  } catch (e) {
    store.setError({ code: 'unknown', message: 'Response received but could not be saved.' } as StreamError);
  }
  store.setStreaming(false);
  store.setStreamingText('');
  return 'success';
}

/** Send a user message and stream the assistant reply. */
export async function sendMessage(chatId: string, text: string): Promise<CompletionResult> {
  const content = text.trim();
  if (!content) return 'error';

  const ts = now();
  const userMsg = await insertMessage({ chat_id: chatId, role: 'user', content, created_at: ts });
  useChatStore.getState().addMessage(userMsg);
  await touchChat(chatId, ts);

  // Auto-title from the first message.
  const { activeChat } = useChatStore.getState();
  if (activeChat?.id === chatId && activeChat.title === 'New Chat') {
    await renameChat(chatId, titleFromText(content));
  }

  const signal = createSendSignal();
  const result = await runCompletion(chatId, signal);

  // On success, auto-send the next queued message (FIFO chain).
  if (result === 'success') {
    const store = useChatStore.getState();
    const next = store.dequeueMessage();
    if (next) {
      return await sendMessage(chatId, next);
    }
  }

  return result;
}

/** Regenerate the last assistant reply (deletes it, then re-streams). */
export async function regenerate(chatId: string): Promise<CompletionResult> {
  const last = await getLastAssistantMessage(chatId);
  if (!last) return 'error';
  await repoDeleteMessage(last.id);
  useChatStore.getState().removeMessage(last.id);
  const signal = createSendSignal();
  return await runCompletion(chatId, signal);
}

/** Delete a single message (DB + store), then refresh list preview. */
export async function deleteMessage(messageId: string): Promise<void> {
  const { activeChatId } = useChatStore.getState();
  await repoDeleteMessage(messageId);
  useChatStore.getState().removeMessage(messageId);
  if (activeChatId) {
    await touchChat(activeChatId);
    await useChatStore.getState().reloadChats();
  }
}

/** Edit a user message in place, then regenerate the reply. */
export async function editAndResend(chatId: string, messageId: string, newText: string): Promise<CompletionResult> {
  const content = newText.trim();
  if (!content) return 'error';
  const { messages } = useChatStore.getState();
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return 'error';
  // Drop everything after the edited user message (the old assistant reply).
  const toRemove = messages.slice(idx + 1);
  for (const m of toRemove) {
    await repoDeleteMessage(m.id);
  }
  useChatStore.setState({ messages: messages.slice(0, idx + 1) });
  // Update the user message content.
  await updateMessageContent(messageId, content);
  useChatStore.getState().updateMessageContent(messageId, content);
  await touchChat(chatId);
  const signal = createSendSignal();
  return await runCompletion(chatId, signal);
}

export { selectDisplayMessages };

/** Render a chat as Markdown for export. */
export async function chatToMarkdown(chatId: string): Promise<string> {
  const chat = await getChat(chatId);
  if (!chat) return '';
  const messages = await listMessages(chatId);
  const lines: string[] = [`# ${chat.title}`, '', `_Exported ${new Date().toLocaleString()}_`, ''];
  for (const m of messages) {
    const who = m.role === 'user' ? '🧑 You' : '🤖 Assistant';
    lines.push(`## ${who}`, '', m.content, '');
  }
  return lines.join('\n');
}

/** Render a chat as JSON for export. */
export async function chatToJson(chatId: string): Promise<string> {
  const chat = await getChat(chatId);
  if (!chat) return '{}';
  const messages = await listMessages(chatId);
  return JSON.stringify({ chat, messages }, null, 2);
}

/** Refresh the chats list. */
export async function refreshChats(): Promise<void> {
  await useChatStore.getState().reloadChats();
}

export { repoListChats as listChats };
