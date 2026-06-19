import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAllChatsData, deleteEverything, exportAllDataJson, getMaskedApiKey, hasApiKey } from '@/features/settings/settings.service';
import { useSettingsStore, type ThemePreference } from '@/features/settings/settings.store';
import { refreshChats } from '@/features/chat/chat.service';
import { PROVIDER_LIST, getProvider } from '@/lib/providers/registry';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { fileStamp } from '@/utils/time';
import { ModelPicker } from '@/components/ui/ModelPicker';

function SectionHeader({ children }: { children: React.ReactNode }) {
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

function ProviderPicker() {
  const { colors } = useTheme();
  const provider = useSettingsStore((s) => s.provider);
  const setProvider = useSettingsStore((s) => s.setProvider);
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {PROVIDER_LIST.map((p) => {
        const active = provider === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => setProvider(p.id)}
            style={[styles.segment, active && { backgroundColor: colors.accent }]}>
            <Text style={[Typography.bodyMedium, { color: active ? colors.accentText : colors.textSecondary }]}>
              {p.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  const providerId = useSettingsStore((s) => s.provider);
  const models = useSettingsStore((s) => s.models);
  const setModel = useSettingsStore((s) => s.setModel);
  const provider = getProvider(providerId);
  const currentModel = models[providerId] ?? provider.defaultModel;
  const [modelDraft, setModelDraft] = useState(currentModel);
  const [maskedKey, setMaskedKey] = useState('');
  const [keyPresent, setKeyPresent] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showCustomModel, setShowCustomModel] = useState(false);

  // Sync modelDraft when the provider changes or custom mode re-opens.
  useEffect(() => {
    setModelDraft(models[providerId] ?? provider.defaultModel);
  }, [providerId, provider.defaultModel, models]);

  // When the provider changes, leave custom mode so the picker shows.
  useEffect(() => {
    setShowCustomModel(false);
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setMaskedKey(await getMaskedApiKey(providerId));
          setKeyPresent(await hasApiKey(providerId));
        } catch {
          /* SecureStore read failed — harmless, UI shows "No key set". */
        }
      })();
    }, [providerId]),
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
    Alert.alert('Erase everything?', 'This deletes all chats AND all API keys. You’ll need to re-enter your keys.', [
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
    Alert.alert('Remove API key?', `You'll need to re-enter a key for ${provider.name} to chat again.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => router.push(`/onboarding/api-key?mode=edit&clear=1&provider=${providerId}`) },
    ]);
  };

  const handleSelectModel = (modelId: string) => {
    setModel(modelId);
    setShowCustomModel(false);
  };

  const handleOpenPicker = () => {
    setShowPicker(true);
  };

  const handleCustomModel = () => {
    setShowCustomModel(true);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
      <SectionHeader>Provider</SectionHeader>
      <ProviderPicker />

      <SectionHeader>API Key ({provider.name})</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[Typography.bodyMedium, { color: colors.text }]}>
          {keyPresent ? `Key is set for ${provider.name}` : `No key set for ${provider.name}`}
        </Text>
        <Text style={[Typography.caption, { color: colors.textMuted, fontFamily: 'monospace', marginTop: 4 }]}>
          {maskedKey || '—'}
        </Text>
      </View>
      <View style={{ gap: Spacing.sm }}>
        <Row icon="key-outline" title={`Edit ${provider.name} API key`} subtitle="Stored only in device secure storage." onPress={() => router.push(`/onboarding/api-key?mode=edit&provider=${providerId}`)} />
        {keyPresent ? <Row icon="trash-outline" title={`Remove ${provider.name} key`} destructive onPress={removeKey} /> : null}
      </View>

      <SectionHeader>Model ({provider.name})</SectionHeader>

      {provider.modelsUrl && !showCustomModel ? (
        <>
          {/* ── Picker mode ── */}
          <Pressable
            onPress={handleOpenPicker}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: pressed ? colors.surfaceSelected : colors.surface, borderColor: colors.border },
            ]}>
            <Text
              style={[Typography.body, { color: colors.text, fontFamily: 'monospace' }]}
              numberOfLines={1}>
              {currentModel}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs }}>
              <Text style={[Typography.caption, { color: colors.textMuted, flex: 1 }]}>
                Tap to choose a model
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
          </Pressable>
        </>
      ) : (
        <>
          {/* ── Text input mode (fallback or "Custom model…") ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={modelDraft}
              onChangeText={setModelDraft}
              onBlur={() => setModel(modelDraft)}
              placeholder={provider.modelPlaceholder ?? provider.defaultModel}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[Typography.body, { color: colors.text, fontFamily: 'monospace' }]}
            />
            <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
              {provider.modelHint ?? `The ${provider.name} model id. Defaults to "${provider.defaultModel}".`}
            </Text>
          </View>
        </>
      )}

      <ModelPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleSelectModel}
        onCustomModel={handleCustomModel}
        currentModel={currentModel}
      />

      <SectionHeader>Appearance</SectionHeader>
      <ThemeSegmented />

      <SectionHeader>Data</SectionHeader>
      <View style={{ gap: Spacing.sm }}>
        <Row icon="download-outline" title="Export all chats" subtitle="Save a JSON backup you can share." onPress={exportData} />
        <Row icon="trash-outline" title="Delete all chats" subtitle="Removes every conversation on this device." destructive onPress={confirmDeleteChats} />
        <Row icon="alert-circle-outline" title="Erase everything" subtitle="Delete chats AND all API keys." destructive onPress={confirmReset} />
      </View>

      <SectionHeader>About</SectionHeader>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[Typography.bodyMedium, { color: colors.text }]}>Zeus Chat</Text>
        <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
          v{Constants.expoConfig?.version ?? '1.0.0'} · Local-first AI chat
        </Text>
        <Pressable onPress={() => openBrowserAsync(provider.keysUrl)} style={styles.linkRow}>
          <Text style={[Typography.body, { color: colors.link }]}>Get a {provider.name} API key</Text>
          <Ionicons name="open-outline" size={16} color={colors.link} />
        </Pressable>
        <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.md }]}>
          Everything stays on your device except the requests sent to the provider. No accounts, no sync, no backend.
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
