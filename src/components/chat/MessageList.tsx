import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet } from 'react-native';

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
  rawMode?: boolean;
}

export function MessageList({ onRegenerate, onEdit, onDelete, rawMode = false }: MessageListProps) {
  const { colors } = useTheme();
  const messages = useChatStore((s) => s.messages);
  const streamingText = useChatStore((s) => s.streamingText);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const scrollRef = useRef<ScrollView>(null);

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
    // Small delay so new content has been laid out before we ask the
    // ScrollView for its final offset.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  // Only auto-scroll when the user is already near the bottom.
  const isAtBottom = useRef(true);
  const onScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const d = contentSize.height - contentOffset.y - layoutMeasurement.height;
    isAtBottom.current = d < 100;
  }, []);

  useEffect(() => {
    if (isAtBottom.current) scrollToBottom();
  }, [streamingText, messages.length, scrollToBottom]);

  if (messages.length === 0 && !isStreaming) {
    return <EmptyState />;
  }

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={32}
      onScrollBeginDrag={() => Keyboard.dismiss()}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
      style={{ backgroundColor: colors.background }}>
      {data.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLast={idx === data.length - 1}
          isStreaming={isStreaming}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onDelete={onDelete}
          rawMode={rawMode}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
  },
});
