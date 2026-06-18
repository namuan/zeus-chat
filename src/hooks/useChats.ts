import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useChatStore } from '@/features/chat/chat.store';

/**
 * Subscribes to the chats list and reloads it whenever the Chats tab gains
 * focus (so previews/updated_at stay fresh after chatting elsewhere).
 */
export function useChats() {
  const chats = useChatStore((s) => s.chats);
  const reloadChats = useChatStore((s) => s.reloadChats);

  useFocusEffect(
    useCallback(() => {
      reloadChats().catch((e) => console.error('[useChats] reload failed', e));
    }, [reloadChats]),
  );

  return { chats, reloadChats };
}
