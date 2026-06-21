import { useCallback, useEffect } from 'react';

import { useChatStore } from '@/features/chat/chat.store';
import {
  cancelAndClear as serviceCancelAndClear,
  cancelStream as serviceCancelStream,
  deleteChat as serviceDeleteChat,
  deleteMessage as serviceDeleteMessage,
  editAndResend as serviceEditAndResend,
  loadChat,
  permanentDeleteChat as servicePermanentDeleteChat,
  regenerate as serviceRegenerate,
  renameChat as serviceRenameChat,
  sendMessage as serviceSendMessage,
} from '@/features/chat/chat.service';

/**
 * The chat screen's primary hook. Wires the active-session store to the
 * chat service. Streaming state (tokens) is intentionally NOT returned here
 * — `MessageList` subscribes to that directly so the rest of the screen
 * doesn't re-render per token. The AbortController is now managed inside
 * chat.service.ts, so queued messages can auto-send on the same controller.
 */
export function useChat(chatId: string) {
  const activeChat = useChatStore((s) => s.activeChat);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const error = useChatStore((s) => s.error);
  const queuedMessages = useChatStore((s) => s.queuedMessages);

  // (Re)load when the chat changes; cancel stream + clear queue on unmount/switch.
  useEffect(() => {
    loadChat(chatId);
    return () => {
      // Delete the chat if it has no messages — avoids orphaned empty chats
      // when the user navigates back without sending anything.
      const state = useChatStore.getState();
      const isEmpty = state.messages.length === 0 && state.activeChatId === chatId;

      serviceCancelAndClear();
      useChatStore.getState().clearActive();

      if (isEmpty) {
        servicePermanentDeleteChat(chatId).catch(console.error);
      }
    };
  }, [chatId]);

  const send = useCallback(
    async (text: string) => {
      await serviceSendMessage(chatId, text);
    },
    [chatId],
  );

  /** Queue a message for later sending (while a response is in progress). */
  const queue = useCallback(
    (text: string) => {
      useChatStore.getState().enqueueMessage(text);
    },
    [],
  );

  /** Remove a specific queued message by index. */
  const removeQueuedMessage = useCallback(
    (index: number) => {
      useChatStore.getState().removeQueuedMessage(index);
    },
    [],
  );

  /** Clear all queued messages without sending them. */
  const clearQueue = useCallback(
    () => {
      useChatStore.getState().clearQueue();
    },
    [],
  );

  /** Send all queued messages now. The first one kicks off the chain. */
  const sendQueuedAll = useCallback(
    async () => {
      const store = useChatStore.getState();
      const first = store.dequeueMessage();
      if (first) {
        await serviceSendMessage(chatId, first);
      }
    },
    [chatId],
  );

  const regenerate = useCallback(async () => {
    await serviceRegenerate(chatId);
  }, [chatId]);

  const rename = useCallback(
    async (title: string) => {
      await serviceRenameChat(chatId, title);
    },
    [chatId],
  );

  const deleteChat = useCallback(async () => {
    serviceCancelStream();
    await serviceDeleteChat(chatId);
  }, [chatId]);

  const editAndResend = useCallback(
    async (messageId: string, newText: string) => {
      await serviceEditAndResend(chatId, messageId, newText);
    },
    [chatId],
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    await serviceDeleteMessage(messageId);
  }, []);

  const cancel = useCallback(() => {
    serviceCancelStream();
  }, []);

  const reload = useCallback(() => loadChat(chatId), [chatId]);

  return {
    activeChat,
    isStreaming,
    error,
    queuedMessages,
    send,
    queue,
    removeQueuedMessage,
    clearQueue,
    sendQueuedAll,
    regenerate,
    cancel,
    rename,
    deleteChat,
    editAndResend,
    deleteMessage,
    reload,
  };
}
