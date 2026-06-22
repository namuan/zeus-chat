import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ContextPieChart } from '@/components/ui/ContextPieChart';

interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  onQueue: (text: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
  queuedCount: number;
  initialText?: string;
  placeholder?: string;
  /** Token usage so far (for the pie-chart indicator). */
  contextUsed?: number;
  /** Model's maximum context window (for the pie-chart indicator). */
  contextTotal?: number;
  /** Called when the user taps the pie chart. */
  onContextPress?: () => void;
}

const MAX_HEIGHT = 140;

export function ChatInput({
  onSend,
  onQueue,
  onCancel,
  isStreaming,
  queuedCount,
  initialText,
  placeholder = 'Message…',
  contextUsed = 0,
  contextTotal = 0,
  onContextPress,
}: ChatInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState(initialText ?? '');
  const [height, setHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (initialText && initialText.length) {
      setText(initialText);
      // Focus on next tick so layout is ready.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [initialText]);

  const canSend = text.trim().length > 0;

  const handleSend = () => {
    const value = text.trim();
    if (!value) return;
    if (Device.isDevice) impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    if (isStreaming) {
      // While a response is in progress, queue the message instead of blocking.
      Promise.resolve(onQueue(value)).catch(console.error);
    } else {
      Promise.resolve(onSend(value)).catch(console.error);
    }
    setText('');
    setHeight(0);
  };

  const handleStop = () => {
    if (Device.isDevice) impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    onCancel();
  };

  const inputHeight = Math.max(40, height);

  return (
    <View style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.hairline }]}>
      {/* ── Queue banner (only when messages are queued) ── */}
      {queuedCount > 0 && (
        <View style={[styles.queueBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.queueBannerText, { color: colors.textSecondary }]}>
            {queuedCount} message{queuedCount > 1 ? 's' : ''} queued
          </Text>
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.queueBannerAction, { color: canSend ? colors.accent : colors.textMuted }]}>
              Send all
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Unified input row ── */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}>
        {/* Text input — fills remaining space */}
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          editable
          onContentSizeChange={(e) =>
            setHeight(Math.min(e.nativeEvent.contentSize.height, MAX_HEIGHT))
          }
          style={[
            styles.input,
            {
              color: colors.text,
              height: inputHeight,
            },
          ]}
        />

        {/* Action buttons + context donut */}
        <View style={styles.trailing}>
          {isStreaming ? (
            <>
              {/* Queue button — becomes active when there's text to queue */}
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                accessibilityLabel={queuedCount > 0 ? `${queuedCount} queued` : 'Queue message'}
                accessibilityRole="button"
                hitSlop={6}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.queueBtn,
                  {
                    backgroundColor: canSend ? colors.warning : colors.surface,
                    opacity: canSend ? (pressed ? 0.7 : 1) : 1,
                  },
                ]}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={canSend ? colors.warningText : colors.textMuted}
                />
                {queuedCount > 0 && (
                  <View style={[styles.queueBadge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.queueBadgeText}>{queuedCount}</Text>
                  </View>
                )}
              </Pressable>

              {/* Stop button */}
              <Pressable
                onPress={handleStop}
                accessibilityLabel="Stop generating"
                accessibilityRole="button"
                hitSlop={6}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.stopBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}>
                <Ionicons name="stop" size={14} color={colors.danger} />
              </Pressable>
            </>
          ) : (
            /* Send button */
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              accessibilityLabel="Send message"
              accessibilityRole="button"
              hitSlop={6}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.sendBtn,
                {
                  backgroundColor: canSend ? colors.accent : colors.surface,
                  opacity: canSend ? (pressed ? 0.8 : 1) : 1,
                },
              ]}>
              <Ionicons
                name="arrow-up"
                size={20}
                color={canSend ? colors.accentText : colors.textMuted}
              />
            </Pressable>
          )}

          <ContextPieChart
            used={contextUsed}
            total={contextTotal}
            onPress={onContextPress}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Outer bar ──
  bar: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // ── Queue banner ──
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
    marginHorizontal: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  queueBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  queueBannerAction: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  // ── Unified input row ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: Radius.lg + 2,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: 6,
  },

  // ── Text input ──
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    padding: 0,
    margin: 0,
    textAlignVertical: 'center',
  },

  // ── Trailing group (donut + buttons) ──
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 1,
    marginLeft: Spacing.xs,
  },

  // ── Action buttons ──
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {},
  queueBtn: {
    position: 'relative',
  },
  queueBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  queueBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  stopBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(215, 57, 59, 0.12)',
  },
});
