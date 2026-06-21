import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { setStringAsync } from 'expo-clipboard';
import * as Device from 'expo-device';
import { Fragment, memo, useEffect, useRef } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { LoadingDots } from '@/components/ui/LoadingDots';
import { Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import type { Message } from '@/features/chat/chat.types';
import { useTheme } from '@/hooks/useTheme';
import { formatTime } from '@/utils/time';

type DisplayMessage = Message & { streaming?: boolean };

interface MessageBubbleProps {
  message: DisplayMessage;
  isLast: boolean;
  isStreaming: boolean;
  rawMode?: boolean;
  provider?: string;
  onRegenerate?: () => void;
  onEdit?: (message: Message) => void;
  onDelete?: (id: string) => void;
}

function Caret() {
  const { colors } = useTheme();
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0, duration: 480, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 480, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return (
    <Animated.Text style={{ color: colors.accent, fontWeight: '700', opacity: op }}>{'▍'}</Animated.Text>
  );
}

function MessageBubbleImpl({
  message,
  isLast,
  isStreaming,
  rawMode = false,
  provider,
  onRegenerate,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const streaming = message.streaming === true;
  const empty = !message.content;

  // Subtle model+provider label for assistant messages.
  const modelLabel = !isUser
    ? [message.model, provider].filter(Boolean).join(' · ')
    : null;

  const showMenu = () => {
    if (Device.isDevice) impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    const buttons: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
      { text: 'Copy', onPress: () => setStringAsync(message.content).catch(() => {}) },
    ];
    if (!isUser && isLast && !isStreaming && onRegenerate) {
      buttons.push({ text: 'Regenerate', onPress: onRegenerate });
    }
    if (isUser && onEdit) {
      buttons.push({ text: 'Edit & resend', onPress: () => onEdit(message) });
    }
    if (onDelete) {
      buttons.push({ text: 'Delete', style: 'destructive', onPress: () => onDelete(message.id) });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('', undefined, buttons);
  };

  return (
    <TouchableOpacity
      onLongPress={showMenu}
      activeOpacity={1}
      delayLongPress={300}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.userBubble, borderBottomRightRadius: Radius.sm }
            : { backgroundColor: colors.assistantBubble, borderBottomLeftRadius: Radius.sm },
        ]}>
        {streaming && empty ? (
          <LoadingDots />
        ) : isUser ? (
          <Fragment>
            <Text selectable style={{ color: colors.userBubbleText, ...Typography.body }}>
              {message.content}
            </Text>
            {message.queued && (
              <View style={styles.queuedTag}>
                <Text style={styles.queuedTagText}>Queued</Text>
              </View>
            )}
          </Fragment>
        ) : rawMode ? (
          <Fragment>
            <Text
              selectable
              style={{
                color: colors.assistantBubbleText,
                fontFamily: Fonts.mono,
                fontSize: 13,
                lineHeight: 19,
              }}>
              {message.content}
            </Text>
            {streaming && !empty && <Caret />}
          </Fragment>
        ) : (
          <Fragment>
            <MarkdownRenderer content={message.content} />
            {streaming && !empty && <Caret />}
          </Fragment>
        )}
      </View>
      <Text style={[styles.time, { color: colors.textMuted }]}>
        {modelLabel ? `${formatTime(message.created_at)} · ${modelLabel}` : formatTime(message.created_at)}
      </Text>
    </TouchableOpacity>
  );
}

export const MessageBubble = memo(MessageBubbleImpl, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.model === next.message.model &&
    prev.isLast === next.isLast &&
    prev.isStreaming === next.isStreaming &&
    prev.rawMode === next.rawMode &&
    prev.provider === next.provider &&
    prev.onRegenerate === next.onRegenerate &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete
  );
});

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.sm,
    marginVertical: Spacing.xs,
    maxWidth: '100%',
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
    maxWidth: '100%',
  },
  time: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    marginTop: 3,
    marginHorizontal: 4,
  },
  queuedTag: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  queuedTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
});
