import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAllChatsData, deleteEverything, exportAllDataJson, getMaskedApiKey, hasApiKey } from '@/features/settings/settings.service';
import { useSettingsStore, type ThemePreference } from '@/features/settings/settings.store';
import { refreshChats } from '@/features/chat/chat.service';
import { OPENROUTER_KEYS_URL, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { fileStamp } from '@/utils/time';

function SectionHeader({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[Typography.caption, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
      {children}
    </Text>
  );
}

function Row({ icon, title, subtitle, onPress, destructive }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceSelected : colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[Typography.body, { color: destructive ? colors.danger : colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function ThemeSegmented() {
  const { colors } = useTheme();
  const preference = useSettingsStore((s) => s.themePreference);
  const setPreference = useSettingsStore((s) => s.setThemePreference);
  const options: { label: string; value: ThemePreference }[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((o) => {
        const active = preference === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => setPreference(o.value)}
            style={[styles.segment, active && { backgroundColor: colors.accent }]}>
            <Text style={[Typography.bodyMedium, { color: active ? colors.accentText : colors.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const model = useSettingsStore((s) => s.model);
  const setModel = useSettingsStore((s) => s.setModel);
  const [modelDraft, setModelDraft] = useState(model);
  const [maskedKey, setMaskedKey] = useState('');
  const [keyPresent, setKeyPresent] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setMaskedKey(await getMaskedApiKey());
          setKeyPresent(await hasApiKey());
        } catch {
          /* SecureStore read failed — harmless, UI shows "No key set". */
        }
      })();
    }, []),
  );

  const exportData = async () => {
    try {
      const json = await exportAllDataJson();
      const data = JSON.parse(json);
      if (!data.chats?.length) {
        Alert.alert('Nothing to export', 'You have no chats yet.');
        return;
      }
      const fileUri = `${FileSystem.cacheDirectory ?? ''}zeus-export-${fileStamp()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Zeus Chat data' });
    } catch (e) {
      Alert.alert('Export failed', (e as Error)?.message ?? 'Could not export data.');
    }
  };

  const confirmDeleteChats = () => {
    Alert.alert('Delete all chats?', 'Every conversation on this device will be removed. Your API key stays.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAllChatsData();
            await refreshChats();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const confirmReset = () => {
    Alert.alert('Erase everything?', 'This deletes all chats AND your API key. You’ll need to re-enter a key.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEverything();
            await refreshChats();
            router.replace('/onboarding/api-key');
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const removeKey = () => {
    Alert.alert('Remove API key?', 'You’ll need to re-enter a key to chat again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => router.push('/onboarding/api-key?mode=edit&clear=1') },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
      <SectionHeader>API Key</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[Typography.bodyMedium, { color: colors.text }]}>
          {keyPresent ? 'Key is set' : 'No key set'}
        </Text>
        <Text style={[Typography.caption, { color: colors.textMuted, fontFamily: 'monospace', marginTop: 4 }]}>
          {maskedKey || '—'}
        </Text>
      </View>
      <View style={{ gap: Spacing.sm }}>
        <Row icon="key-outline" title="Edit API key" subtitle="Stored only in device secure storage." onPress={() => router.push('/onboarding/api-key?mode=edit')} />
        {keyPresent ? <Row icon="trash-outline" title="Remove API key" destructive onPress={removeKey} /> : null}
      </View>

      <SectionHeader>Model</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          value={modelDraft}
          onChangeText={setModelDraft}
          onBlur={() => setModel(modelDraft)}
          placeholder="free-router"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[Typography.body, { color: colors.text, fontFamily: 'monospace' }]}
        />
        <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
          The OpenRouter model id. Defaults to “free-router”. You can use any OpenRouter model, e.g. “openrouter/auto” or a “:free” model.
        </Text>
      </View>

      <SectionHeader>Appearance</SectionHeader>
      <ThemeSegmented />

      <SectionHeader>Data</SectionHeader>
      <View style={{ gap: Spacing.sm }}>
        <Row icon="download-outline" title="Export all chats" subtitle="Save a JSON backup you can share." onPress={exportData} />
        <Row icon="trash-outline" title="Delete all chats" subtitle="Removes every conversation on this device." destructive onPress={confirmDeleteChats} />
        <Row icon="alert-circle-outline" title="Erase everything" subtitle="Delete chats AND the API key." destructive onPress={confirmReset} />
      </View>

      <SectionHeader>About</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[Typography.bodyMedium, { color: colors.text }]}>Zeus Chat</Text>
        <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
          v{Constants.expoConfig?.version ?? '1.0.0'} · Local-first AI chat
        </Text>
        <Pressable onPress={() => openBrowserAsync(OPENROUTER_KEYS_URL)} style={styles.linkRow}>
          <Text style={[Typography.body, { color: colors.link }]}>Get an OpenRouter API key</Text>
          <Ionicons name="open-outline" size={16} color={colors.link} />
        </Pressable>
        <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.md }]}>
          Everything stays on your device except the requests sent to OpenRouter. No accounts, no sync, no backend.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
