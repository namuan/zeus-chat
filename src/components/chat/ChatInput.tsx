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

  return (
    <View style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          editable
          onContentSizeChange={(e) => setHeight(Math.min(e.nativeEvent.contentSize.height, MAX_HEIGHT))}
          style={[
            styles.input,
            {
              color: colors.text,
              height: Math.max(40, height),
            },
          ]}
        />
      </View>

      <View style={styles.actionsColumn}>
        <ContextPieChart
          used={contextUsed}
          total={contextTotal}
          onPress={onContextPress}
        />

        <View style={styles.actions}>
          {isStreaming ? (
            <>
              {/* Queue button — replaces send as the primary action while streaming */}
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                accessibilityLabel={queuedCount > 0 ? `${queuedCount} queued` : 'Queue message'}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.queueBtn,
                  {
                    backgroundColor: canSend ? colors.warning : colors.surface,
                    opacity: canSend ? (pressed ? 0.8 : 1) : 1,
                  },
                ]}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={canSend ? colors.warningText : colors.textMuted}
                />
                {queuedCount > 0 && (
                  <View style={styles.queueBadge}>
                    <Text style={styles.queueBadgeText}>{queuedCount}</Text>
                  </View>
                )}
              </Pressable>

              {/* Small stop button — secondary action */}
              <Pressable
                onPress={handleStop}
                accessibilityLabel="Stop generating"
                accessibilityRole="button"
                style={({ pressed }) => [styles.stopBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <Ionicons name="stop" size={14} color={colors.danger} />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              accessibilityLabel="Send message"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: canSend ? colors.accent : colors.surface,
                  opacity: canSend ? (pressed ? 0.8 : 1) : 1,
                },
              ]}>
              <Ionicons name="arrow-up" size={20} color={canSend ? colors.accentText : colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 21,
    padding: 0,
    margin: 0,
    textAlignVertical: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 2,
  },
  actionsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  queueBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D7393B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  queueBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  stopBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(215, 57, 59, 0.1)',
  },
});
