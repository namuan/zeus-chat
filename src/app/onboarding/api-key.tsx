import { router, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { deleteApiKey, saveApiKey } from '@/features/settings/settings.service';
import { OPENROUTER_KEYS_URL, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * First-launch onboarding AND the "edit/remove key" screen.
 * `mode=edit` shows a back button and returns to the previous screen on save.
 * `clear=1` wipes the stored key on mount (used by the "Remove API key" flow).
 */
export default function ApiKeyScreen() {
  const params = useLocalSearchParams<{ mode?: string; clear?: string }>();
  const isEdit = params.mode === 'edit';
  const shouldClear = params.clear === '1';

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shouldClear) {
      deleteApiKey().catch(() => {});
    }
  }, [shouldClear]);

  const save = async () => {
    const value = key.trim();
    if (!value) return;
    setSaving(true);
    try {
      await saveApiKey(value);
      if (isEdit) {
        router.back();
      } else {
        router.replace('/(tabs)/chats');
      }
    } catch (e) {
      Alert.alert('Could not save key', (e as Error)?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isEdit ? (
        <View style={{ paddingTop: insets.top, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
          <IconButton name="arrow-back" size={26} accessibilityLabel="Back" onPress={() => router.back()} />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: Spacing.xxl, paddingBottom: insets.bottom + Spacing.xxl, flexGrow: 1, maxWidth: 560, width: '100%', alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1, justifyContent: 'center', minHeight: 320 }}>
          <Text style={[Typography.title, { color: colors.text }]}>
            {isEdit ? 'API Key' : 'Welcome to Zeus Chat'}
          </Text>
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            {isEdit
              ? 'Update your OpenRouter API key. It’s stored only in this device’s secure storage.'
              : 'A private, local-first AI chat. Paste your OpenRouter API key to get started — no account, no backend.'}
          </Text>

          <Pressable onPress={() => openBrowserAsync(OPENROUTER_KEYS_URL)} style={styles.link}>
            <Text style={[Typography.body, { color: colors.link }]}>Get an OpenRouter API key →</Text>
          </Pressable>

          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TextInput
              value={key}
              onChangeText={setKey}
              placeholder="sk-or-v1-…"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              style={[Typography.body, { color: colors.text, flex: 1, fontFamily: 'monospace' }]}
            />
            <IconButton
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textMuted}
              onPress={() => setShow((s) => !s)}
            />
          </View>

          <View style={{ marginTop: Spacing.lg }}>
            <Button label={saving ? 'Saving…' : isEdit ? 'Save key' : 'Start chatting'} onPress={save} loading={saving} disabled={!key.trim()} fullWidth size="lg" />
          </View>

          <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.lg, textAlign: 'center' }]}>
            Your key never leaves the device except to call OpenRouter directly.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { marginTop: Spacing.lg },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xl,
  },
});
