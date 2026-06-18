import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { createChat, deleteChat } from '@/features/chat/chat.service';
import { useChats } from '@/hooks/useChats';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { formatRelative } from '@/utils/time';

export default function ChatsScreen() {
  const { colors } = useTheme();
  const { chats } = useChats();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [query, setQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          name="create-outline"
          size={26}
          accessibilityLabel="New chat"
           onPress={async () => {
             const chat = await createChat().catch(console.error);
             if (!chat) return;
             router.push({ pathname: '/chat/[id]', params: { id: chat.id } });
           }}
        />
      ),
    });
  }, [navigation]);

  const filtered = query.trim()
    ? chats.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
    : chats;

  const openChat = (id: string) => {
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  const confirmDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete chat?',
      `“${title}” and its messages will be permanently removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteChat(id).catch(console.error) },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {query.length > 0 && (
          <IconButton name="close-circle" size={18} color={colors.textMuted} onPress={() => setQuery('')} />
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            {query ? 'No chats match your search.' : 'No chats yet. Tap + to start one.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}>
          {filtered.map((chat) => (
            <Swipeable
              key={chat.id}
              renderRightActions={() => (
                <Pressable
                  onPress={() => confirmDelete(chat.id, chat.title)}
                  style={[styles.deleteSwipe, { backgroundColor: colors.danger }]}>
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  <Text style={[Typography.bodyMedium, { color: '#FFFFFF' }]}>Delete</Text>
                </Pressable>
              )}
              overshootRight={false}>
              <Pressable
                onPress={() => openChat(chat.id)}
                onLongPress={() => confirmDelete(chat.id, chat.title)}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? colors.surfaceSelected : colors.background, borderBottomColor: colors.hairline },
                ]}>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]} numberOfLines={1}>
                  {chat.title}
                </Text>
                <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
                  {chat.last_role === 'assistant' ? '🤖 ' : chat.last_role === 'user' ? '🧑 ' : ''}
                  {chat.last_message ?? 'No messages yet'}
                </Text>
              </View>
              <View style={styles.rowMeta}>
                <Text style={[Typography.caption, { color: colors.textMuted }]}>
                  {formatRelative(chat.updated_at)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
              </View>
            </Pressable>
            </Swipeable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 6 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, marginRight: Spacing.md },
  rowMeta: { alignItems: 'flex-end' },
  deleteSwipe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    minWidth: 100,
  },
});
