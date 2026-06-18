import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { ActionSheet, type ActionItem } from '@/components/ui/ActionSheet';
import { IconButton } from '@/components/ui/IconButton';
import { PromptModal } from '@/components/ui/PromptModal';
import { chatToMarkdown, chatToJson } from '@/features/chat/chat.service';
import { useChatStore } from '@/features/chat/chat.store';
import type { Message } from '@/features/chat/chat.types';
import { useChat } from '@/hooks/useChat';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';
import { fileStamp } from '@/utils/time';

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string; prompt?: string }>();
  const id = String(params.id ?? '');
  const initialPrompt = typeof params.prompt === 'string' ? params.prompt : undefined;

  const {
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
  } = useChat(id);

  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [renameOpen, setRenameOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; text: string } | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: activeChat?.title ?? 'Chat',
      headerRight: () => (
        <View style={styles.headerActions}>
          <IconButton name="create-outline" size={24} accessibilityLabel="Rename chat" onPress={() => setRenameOpen(true)} />
          <IconButton name="ellipsis-vertical" size={24} accessibilityLabel="Chat options" onPress={() => setMenuVisible(true)} />
        </View>
      ),
    });
  }, [navigation, activeChat?.title]);

  const exportChat = async (kind: 'md' | 'json') => {
    try {
      const content = kind === 'md' ? await chatToMarkdown(id) : await chatToJson(id);
      if (!content || content === '{}') {
        Alert.alert('Nothing to export', 'This chat has no messages yet.');
        return;
      }
      const ext = kind === 'md' ? 'md' : 'json';
      const safeTitle = (activeChat?.title ?? 'chat').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40);
      const fileUri = `${FileSystem.cacheDirectory ?? ''}${safeTitle}-${fileStamp()}.${ext}`;
      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: kind === 'md' ? 'text/markdown' : 'application/json',
        dialogTitle: `Export ${kind.toUpperCase()}`,
      });
    } catch (e) {
      Alert.alert('Export failed', (e as Error)?.message ?? 'Could not export chat.');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete chat?', 'This conversation will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChat();
            router.back();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const menuItems: ActionItem[] = [
    { label: 'Export as Markdown', icon: 'document-text-outline', onPress: () => exportChat('md').catch(console.error) },
    { label: 'Export as JSON', icon: 'code-slash-outline', onPress: () => exportChat('json').catch(console.error) },
    { label: 'Delete chat', icon: 'trash-outline', destructive: true, onPress: () => { setMenuVisible(false); confirmDelete(); } },
  ];

  const onEditMessage = useCallback((m: Message) => {
    setEditTarget({ id: m.id, text: m.content });
  }, []);

  const onDeleteMessage = useCallback(
    (messageId: string) => {
      Alert.alert('Delete message?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(messageId).catch(console.error) },
      ]);
    },
    [deleteMessage],
  );

  const onRegenerate = useCallback(() => {
    if (!isStreaming) regenerate().catch(console.error);
  }, [isStreaming, regenerate]);

  const dismissError = () => useChatStore.getState().setError(null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 60, default: 0 })}>
      <View style={{ flex: 1 }}>
        <MessageList onRegenerate={onRegenerate} onEdit={onEditMessage} onDelete={onDeleteMessage} />
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSurface, borderTopColor: colors.danger }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={[Typography.caption, { color: colors.danger, flex: 1 }]} numberOfLines={2}>
            {error.message}
          </Text>
          {error.code !== 'auth' ? (
            <Pressable onPress={onRegenerate} hitSlop={8}>
              <Text style={[Typography.caption, { color: colors.danger, fontWeight: '700' }]}>Retry</Text>
            </Pressable>
          ) : null}
          <IconButton name="close" size={18} color={colors.danger} onPress={dismissError} />
        </View>
      ) : null}

      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput onSend={send} onCancel={cancel} isStreaming={isStreaming} initialText={initialPrompt} />
      </View>

      <PromptModal
        visible={renameOpen}
        title="Rename chat"
        initialValue={activeChat?.title ?? ''}
        placeholder="Chat title"
        onSave={(value) => {
          rename(value);
          setRenameOpen(false);
        }}
        onClose={() => setRenameOpen(false)}
      />

      <PromptModal
        visible={!!editTarget}
        title="Edit & resend"
        initialValue={editTarget?.text ?? ''}
        placeholder="Edit your message"
        confirmLabel="Resend"
        onSave={(value) => {
          const target = editTarget;
          setEditTarget(null);
          if (target) editAndResend(target.id, value);
        }}
        onClose={() => setEditTarget(null)}
      />

      <ActionSheet
        visible={menuVisible}
        title={activeChat?.title ?? 'Chat'}
        items={menuItems}
        onClose={() => setMenuVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
});
