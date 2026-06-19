import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettingsStore } from '@/features/settings/settings.store';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ModelInfo } from '@/lib/providers/types';

interface ModelPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  onCustomModel: () => void;
  currentModel: string;
}

/**
 * A bottom-sheet model picker that fetches available models from the active
 * provider, lets the user search and filter by free-only, and selects one.
 *
 * The "Free only" toggle defaults to on so new users see zero-cost models
 * first. Power users can toggle it off to browse everything.
 */
export function ModelPicker({
  visible,
  onClose,
  onSelect,
  onCustomModel,
  currentModel,
}: ModelPickerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const providerId = useSettingsStore((s) => s.provider);
  const availableModels = useSettingsStore((s) => s.availableModels);
  const modelsLoading = useSettingsStore((s) => s.modelsLoading);
  const modelsError = useSettingsStore((s) => s.modelsError);
  const fetchAvailableModels = useSettingsStore((s) => s.fetchAvailableModels);

  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(true);

  // Fetch models whenever the picker opens.
  useEffect(() => {
    if (visible) {
      fetchAvailableModels();
      setSearch('');
      setFreeOnly(true);
    }
  }, [visible, fetchAvailableModels]);

  const filtered = useMemo(() => {
    let list = availableModels;

    if (freeOnly) {
      list = list.filter((m) => m.free);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q),
      );
    }

    return list;
  }, [availableModels, freeOnly, search]);

  const handleSelect = useCallback(
    (model: ModelInfo) => {
      onSelect(model.id);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleCustomModel = useCallback(() => {
    onCustomModel();
    onClose();
  }, [onCustomModel, onClose]);

  const isSelected = useCallback(
    (id: string) => id === currentModel,
    [currentModel],
  );

  const listHeight = useMemo(() => {
    // Estimate: each row ~52px, max ~400px visible
    const rowCount = Math.min(filtered.length, 8);
    return Math.max(100, rowCount * 52 + 16);
  }, [filtered.length]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surfaceElevated, paddingBottom: insets.bottom },
          ]}
          onPress={(e) => e.stopPropagation()}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={[Typography.subtitle, { color: colors.text }]}>
              Select a Model
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* ── Search bar ── */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search models…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[Typography.body, { color: colors.text, flex: 1, paddingVertical: 0 }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* ── Free-only toggle ── */}
          <Pressable
            onPress={() => setFreeOnly((p) => !p)}
            style={styles.toggleRow}>
            <Ionicons
              name={freeOnly ? 'checkbox' : 'square-outline'}
              size={20}
              color={freeOnly ? colors.accent : colors.textMuted}
            />
            <Text style={[Typography.body, { color: colors.text }]}>
              Free models only
            </Text>
            {freeOnly && (
              <View style={[styles.badge, { backgroundColor: colors.success + '1A' }]}>
                <Text style={[Typography.caption, { color: colors.success }]}>
                  {availableModels.filter((m) => m.free).length}
                </Text>
              </View>
            )}
          </Pressable>

          {/* ── Content area ── */}
          <View style={{ height: listHeight, minHeight: 120 }}>
            {modelsLoading && availableModels.length === 0 ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                  Loading models…
                </Text>
              </View>
            ) : modelsError && availableModels.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
                <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' }]}>
                  {modelsError}
                </Text>
                <Pressable
                  onPress={fetchAvailableModels}
                  style={({ pressed }) => [
                    styles.retryBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Ionicons name="refresh" size={16} color={colors.accent} />
                  <Text style={[Typography.bodyMedium, { color: colors.accent }]}>Retry</Text>
                </Pressable>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
                  {search
                    ? `No models match "${search}".`
                    : freeOnly
                      ? 'No free models available.'
                      : 'No models available.'}
                </Text>
              </View>
            ) : (
              <FlashList
                data={filtered}
                keyExtractor={(item: ModelInfo) => item.id}
                renderItem={({ item }: { item: ModelInfo }) => (
                  <Pressable
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [
                      styles.modelRow,
                      { backgroundColor: pressed ? colors.surfaceSelected : 'transparent' },
                    ]}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          Typography.body,
                          { color: colors.text, fontFamily: 'monospace' },
                        ]}
                        numberOfLines={1}>
                        {item.id}
                      </Text>
                      {item.name !== item.id && (
                        <Text
                          style={[
                            Typography.caption,
                            { color: colors.textMuted, marginTop: 1 },
                          ]}
                          numberOfLines={1}>
                          {item.name}
                        </Text>
                      )}
                    </View>

                    <View style={styles.modelRowEnd}>
                      {item.free && (
                        <View style={[styles.freeBadge, { backgroundColor: colors.success + '1A' }]}>
                          <Text style={[Typography.caption, { color: colors.success, fontWeight: '600' }]}>
                            FREE
                          </Text>
                        </View>
                      )}
                      {isSelected(item.id) && (
                        <Ionicons name="checkmark" size={20} color={colors.accent} />
                      )}
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>

          {/* ── Custom model option ── */}
          <Pressable
            onPress={handleCustomModel}
            style={({ pressed }) => [
              styles.customRow,
              { backgroundColor: pressed ? colors.surfaceSelected : 'transparent' },
            ]}>
            <Ionicons name="create-outline" size={20} color={colors.accent} />
            <Text style={[Typography.body, { color: colors.accent }]}>
              Custom model…
            </Text>
          </Pressable>

          {/* ── Cancel button ── */}
          <View style={[styles.gap, { backgroundColor: colors.surfaceElevated }]} />
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelRow,
              { backgroundColor: pressed ? colors.surfaceSelected : 'transparent' },
            ]}>
            <Text style={[Typography.bodyMedium, { color: colors.text, flex: 1, textAlign: 'center' }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.md,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 52,
  },
  modelRowEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.md,
  },
  freeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  gap: { height: 8 },
  cancelRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
