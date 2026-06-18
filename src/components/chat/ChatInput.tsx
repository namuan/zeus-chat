import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  onCancel: () => void;
  isStreaming: boolean;
  initialText?: string;
  placeholder?: string;
}

const MAX_HEIGHT = 140;

export function ChatInput({
  onSend,
  onCancel,
  isStreaming,
  initialText,
  placeholder = 'Message…',
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

  const canSend = text.trim().length > 0 && !isStreaming;

  const handleSend = () => {
    const value = text.trim();
    if (!value || isStreaming) return;
    if (Device.isDevice) impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    Promise.resolve(onSend(value)).catch(console.error);
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

      {isStreaming ? (
        <Pressable
          onPress={handleStop}
          accessibilityLabel="Stop generating"
          accessibilityRole="button"
          style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.danger, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="stop" size={18} color="#FFFFFF" />
        </Pressable>
      ) : (
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          accessibilityLabel="Send message"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: canSend ? colors.accent : colors.surface, opacity: canSend ? (pressed ? 0.8 : 1) : 1 },
          ]}>
          <Ionicons name="arrow-up" size={20} color={canSend ? colors.accentText : colors.textMuted} />
        </Pressable>
      )}
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
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
