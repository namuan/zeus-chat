import { useCallback, useEffect } from 'react';

import { useChatStore } from '@/features/chat/chat.store';
import {
  deleteChat as serviceDeleteChat,
  deleteMessage as serviceDeleteMessage,
  editAndResend as serviceEditAndResend,
  loadChat,
  regenerate as serviceRegenerate,
  renameChat as serviceRenameChat,
  sendMessage as serviceSendMessage,
} from '@/features/chat/chat.service';
import { useStreaming } from '@/hooks/useStreaming';

/**
 * The chat screen's primary hook. Wires the active-session store to the
 * streaming controller and the chat service. Streaming state (tokens) is
 * intentionally NOT returned here — `MessageList` subscribes to that
 * directly so the rest of the screen doesn't re-render per token.
 */
export function useChat(chatId: string) {
  const activeChat = useChatStore((s) => s.activeChat);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const error = useChatStore((s) => s.error);

  const { newSignal, cancel } = useStreaming();

  // (Re)load when the chat changes; abort + clear on unmount/switch.
  useEffect(() => {
    loadChat(chatId);
    return () => {
      cancel();
      useChatStore.getState().clearActive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const send = useCallback(
    async (text: string) => {
      const signal = newSignal();
      await serviceSendMessage(chatId, text, signal);
    },
    [chatId, newSignal],
  );

  const regenerate = useCallback(async () => {
    const signal = newSignal();
    await serviceRegenerate(chatId, signal);
  }, [chatId, newSignal]);

  const rename = useCallback(
    async (title: string) => {
      await serviceRenameChat(chatId, title);
    },
    [chatId],
  );

  const deleteChat = useCallback(async () => {
    cancel();
    await serviceDeleteChat(chatId);
  }, [chatId, cancel]);

  const editAndResend = useCallback(
    async (messageId: string, newText: string) => {
      const signal = newSignal();
      await serviceEditAndResend(chatId, messageId, newText, signal);
    },
    [chatId, newSignal],
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    await serviceDeleteMessage(messageId);
  }, []);

  const reload = useCallback(() => loadChat(chatId), [chatId]);

  return {
    activeChat,
    isStreaming,
    error,
    send,
    regenerate,
    cancel,
    rename,
    deleteChat,
    editAndResend,
    deleteMessage,
    reload,
  };
}
