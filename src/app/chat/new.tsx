import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { createChat } from '@/features/chat/chat.service';
import { useTheme } from '@/hooks/useTheme';

/**
 * Thin route that creates a new chat and immediately replaces itself with
 * the chat screen. Lets callers link to "/chat/new" without knowing the id.
 */
export default function NewChatRoute() {
  const { colors } = useTheme();

  useEffect(() => {
    (async () => {
      const chat = await createChat();
      router.replace({ pathname: '/chat/[id]', params: { id: chat.id } });
    })();
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
