import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listDeletedChats, restoreChat, permanentDeleteChat } from '@/features/chat/chat.service';
import type { ChatWithPreview } from '@/features/chat/chat.types';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { formatRelative } from '@/utils/time';

const PURGE_DAYS = 14;

export default function RecentlyDeletedScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [deletedChats, setDeletedChats] = useState<ChatWithPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDeletedChats(await listDeletedChats());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRestore = async (id: string) => {
    try {
      await restoreChat(id);
      setDeletedChats((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePermanentDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete permanently?',
      `“${title}” and its messages will be permanently removed from this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await permanentDeleteChat(id);
              setDeletedChats((prev) => prev.filter((c) => c.id !== id));
            } catch (e) {
              console.error(e);
            }
          },
        },
      ],
    );
  };

  const handleRecoverAll = async () => {
    try {
      for (const chat of deletedChats) {
        await restoreChat(chat.id);
      }
      setDeletedChats([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEmptyTrash = () => {
    const count = deletedChats.length;
    Alert.alert(
      'Empty trash?',
      `${count} chat${count > 1 ? 's' : ''} will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty trash',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const chat of deletedChats) {
                await permanentDeleteChat(chat.id);
              }
              setDeletedChats([]);
            } catch (e) {
              console.error(e);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xxl,
        maxWidth: 680,
        width: '100%',
        alignSelf: 'center',
      }}>
      <Text style={[Typography.body, { color: colors.textSecondary, marginBottom: Spacing.lg }]}>
        Chats are automatically deleted after being in the trash for {PURGE_DAYS} days.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.xxl }} />
      ) : deletedChats.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trash-outline" size={40} color={colors.textMuted} />
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            No recently deleted chats.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.bulkActions, { borderColor: colors.border }]}>
            <Pressable
              onPress={handleRecoverAll}
              style={({ pressed }) => [styles.bulkButton, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="refresh-outline" size={18} color={colors.accent} />
              <Text style={[Typography.bodyMedium, { color: colors.accent }]}>Recover All</Text>
            </Pressable>
            <Pressable
              onPress={handleEmptyTrash}
              style={({ pressed }) => [styles.bulkButton, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[Typography.bodyMedium, { color: colors.danger }]}>Empty Trash</Text>
            </Pressable>
          </View>

          <View style={{ gap: Spacing.sm }}>
            {deletedChats.map((chat) => (
              <View key={chat.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.bodyMedium, { color: colors.text }]} numberOfLines={1}>
                    {chat.title}
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
                    {chat.last_role === 'assistant' ? '🤖 ' : chat.last_role === 'user' ? '🧑 ' : ''}
                    {chat.last_message ?? 'No messages'}
                  </Text>
                  {chat.deleted_at ? (
                    <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                      Deleted {formatRelative(chat.deleted_at)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => handleRestore(chat.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}>
                    <Ionicons name="refresh-outline" size={18} color={colors.accent} />
                    <Text style={[Typography.caption, { color: colors.accent, fontWeight: '600' }]}>Restore</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handlePermanentDelete(chat.id, chat.title)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={[Typography.caption, { color: colors.danger, fontWeight: '600' }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl * 2,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
});
