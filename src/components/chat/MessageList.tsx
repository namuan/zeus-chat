import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet } from 'react-native';

import { MessageBubble } from '@/components/chat/MessageBubble';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChatStore } from '@/features/chat/chat.store';
import type { Message } from '@/features/chat/chat.types';
import { useTheme } from '@/hooks/useTheme';

type DisplayMessage = Message & { streaming?: boolean };

interface MessageListProps {
  onRegenerate: () => void;
  onEdit: (message: Message) => void;
  onDelete: (id: string) => void;
}

export function MessageList({ onRegenerate, onEdit, onDelete }: MessageListProps) {
  const { colors } = useTheme();
  const messages = useChatStore((s) => s.messages);
  const streamingText = useChatStore((s) => s.streamingText);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const listRef = useRef<FlatList>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const data: DisplayMessage[] = isStreaming
    ? [
        ...messages,
        {
          id: '__streaming__',
          chat_id: '',
          role: 'assistant',
          content: streamingText,
          created_at: Date.now(),
          streaming: true,
        },
      ]
    : messages;

  const scrollToBottom = useCallback(() => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 16);
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromEnd = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setAtBottom(distanceFromEnd < 100);
  }, []);

  // Follow new tokens / new messages only if the user is already at the bottom.
  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [streamingText, messages.length, atBottom, scrollToBottom]);

  if (messages.length === 0 && !isStreaming) {
    return <EmptyState />;
  }

  return (
    <FlatList
      ref={listRef}
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <MessageBubble
          message={item}
          isLast={index === data.length - 1}
          isStreaming={isStreaming}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      onScroll={onScroll}
      scrollEventThrottle={32}
      onContentSizeChange={() => {
        if (atBottom) scrollToBottom();
      }}
      onScrollBeginDrag={() => Keyboard.dismiss()}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
      style={{ backgroundColor: colors.background }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
    flexGrow: 1,
  },
});
