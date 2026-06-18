import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface ActionItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  items: ActionItem[];
  onClose: () => void;
}

/**
 * A bottom action sheet. Tapping the dimmed backdrop or an item auto‑closes.
 * Items fire their `onPress` handler; the "Cancel" row at the bottom is
 * always present and just calls `onClose`.
 */
export function ActionSheet({ visible, title, items, onClose }: ActionSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = (item: ActionItem) => {
    onClose();
    // Fire the action on next tick so the close animation has started.
    setTimeout(() => item.onPress(), 16);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceElevated, paddingBottom: insets.bottom }]}
          onPress={(e) => e.stopPropagation()}>
          {title ? (
            <View style={styles.titleWrap}>
              <Text style={[Typography.caption, { color: colors.textMuted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                {title}
              </Text>
            </View>
          ) : null}

          {items.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => handlePress(item)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? colors.surfaceSelected : 'transparent' },
              ]}>
              <Ionicons
                name={item.icon}
                size={20}
                color={item.destructive ? colors.danger : colors.accent}
              />
              <Text
                style={[
                  Typography.body,
                  { color: item.destructive ? colors.danger : colors.text, flex: 1 },
                ]}>
                {item.label}
              </Text>
            </Pressable>
          ))}

          <View style={[styles.gap, { backgroundColor: colors.surfaceElevated }]} />

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.row,
              styles.cancelRow,
              { backgroundColor: pressed ? colors.surfaceSelected : 'transparent' },
            ]}>
            <View style={{ width: 20, height: 20 }} />
            <Text style={[Typography.bodyMedium, { color: colors.text, flex: 1 }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.sm,
  },
  titleWrap: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 50,
  },
  gap: { height: 8, backgroundColor: 'transparent' },
  cancelRow: { justifyContent: 'flex-start' },
});
