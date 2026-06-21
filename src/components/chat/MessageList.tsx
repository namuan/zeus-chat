import { FlashList } from '@shopify/flash-list';
import type { FlashListRef } from '@shopify/flash-list';
import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, StyleSheet } from 'react-native';

import { MessageBubble } from '@/components/chat/MessageBubble';
import { SuggestionChips } from '@/components/chat/SuggestionChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChatStore } from '@/features/chat/chat.store';
import type { Message } from '@/features/chat/chat.types';
import { useTheme } from '@/hooks/useTheme';

type DisplayMessage = Message & {
  streaming?: boolean;
  queued?: boolean;
  /** Synthetic item for suggestion chips (not a real message). */
  _suggestions?: string[];
  _suggestionsLoading?: boolean;
};

interface MessageListProps {
  onRegenerate: () => void;
  onEdit: (message: Message) => void;
  onDelete: (id: string) => void;
  onSuggestionTap: (suggestion: string) => void;
  rawMode?: boolean;
}

export function MessageList({
  onRegenerate,
  onEdit,
  onDelete,
  onSuggestionTap,
  rawMode = false,
}: MessageListProps) {
  const { colors } = useTheme();
  const messages = useChatStore((s) => s.messages);
  const streamingText = useChatStore((s) => s.streamingText);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const queuedMessages = useChatStore((s) => s.queuedMessages);
  const activeChat = useChatStore((s) => s.activeChat);
  const suggestions = useChatStore((s) => s.suggestions);
  const suggestionsLoading = useChatStore((s) => s.suggestionsLoading);

  const listRef = useRef<FlashListRef<DisplayMessage>>(null);

  // Synthetic messages for queued entries (shown below the conversation).
  const queuedData: DisplayMessage[] = queuedMessages.map((text, i) => ({
    id: `__queued__${i}`,
    chat_id: '',
    role: 'user' as const,
    content: text,
    created_at: Date.now() + i,
    queued: true,
  }));

  const streamingData: DisplayMessage[] = isStreaming
    ? [
        {
          id: '__streaming__',
          chat_id: '',
          role: 'assistant',
          content: streamingText,
          created_at: Date.now(),
          streaming: true,
        },
      ]
    : [];

  // Synthetic entry for suggestion chips — only when not streaming.
  const suggestionsEntry: DisplayMessage | null =
    !isStreaming && (suggestions.length > 0 || suggestionsLoading)
      ? {
          id: '__suggestions__',
          chat_id: '',
          role: 'assistant',
          content: '',
          created_at: 0,
          _suggestions: suggestions,
          _suggestionsLoading: suggestionsLoading,
        }
      : null;

  const data: DisplayMessage[] = [
    ...messages,
    ...streamingData,
    ...(suggestionsEntry ? [suggestionsEntry] : []),
    ...queuedData,
  ];

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  const isAtBottom = useRef(true);
  const onScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const d = contentSize.height - contentOffset.y - layoutMeasurement.height;
    isAtBottom.current = d < 100;
  }, []);

  useEffect(() => {
    if (isAtBottom.current) scrollToBottom();
  }, [streamingText, messages.length, suggestionsEntry, scrollToBottom]);

  if (messages.length === 0 && !isStreaming && queuedMessages.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlashList
      ref={listRef}
      data={data}
      keyExtractor={(item: DisplayMessage) => item.id}
      renderItem={({ item, index }: { item: DisplayMessage; index: number }) => {
        if (item._suggestions) {
          return (
            <SuggestionChips
              suggestions={item._suggestions}
              isLoading={!!item._suggestionsLoading}
              onTap={onSuggestionTap}
            />
          );
        }
        return (
          <MessageBubble
            message={item}
            isLast={index === data.length - 1}
            isStreaming={isStreaming}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
            onDelete={onDelete}
            rawMode={rawMode}
            provider={activeChat?.provider}
          />
        );
      }}
      onScroll={onScroll}
      scrollEventThrottle={32}
      onContentSizeChange={() => {
        if (isAtBottom.current) scrollToBottom();
      }}
      onScrollBeginDrag={() => Keyboard.dismiss()}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      maintainVisibleContentPosition={{
        autoscrollToBottomThreshold: 100,
        animateAutoScrollToBottom: false,
        startRenderingFromBottom: true,
      }}
      contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
      style={{ backgroundColor: colors.background }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
  },
});
