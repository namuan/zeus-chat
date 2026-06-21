import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ContextPieChart } from '@/components/ui/ContextPieChart';

interface ContextInfoPanelProps {
  visible: boolean;
  onClose: () => void;
  /** Number of tokens consumed so far. */
  used: number;
  /** Maximum context window in tokens. */
  total: number;
  /** The model ID for display (e.g. "openai/gpt-4o"). */
  modelName?: string;
}

/**
 * An expanded context-usage info panel shown as a bottom sheet when the
 * user taps the pie-chart indicator in the header.
 */
export function ContextInfoPanel({
  visible,
  onClose,
  used,
  total,
  modelName,
}: ContextInfoPanelProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const percentage = total > 0 ? Math.min(used / total, 1) : 0;

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const usageColor =
    percentage > 0.8 ? colors.danger : percentage > 0.5 ? colors.warning : colors.success;

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
              Context Usage
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* ── Large donut ── */}
          <View style={styles.chartArea}>
            <ContextPieChart used={used} total={total} size={100} strokeWidth={8} />
            <Text
              style={[
                Typography.heading,
                { color: usageColor, marginTop: Spacing.sm },
              ]}>
              {percentage >= 0.01
                ? `${Math.round(percentage * 100)}%`
                : '<1%'}
            </Text>
            <Text style={[Typography.caption, { color: colors.textMuted, marginTop: Spacing.xs }]}>
              of context window used
            </Text>
          </View>

          {/* ── Stats rows ── */}
          <View style={styles.statsSection}>
            <View style={styles.statRow}>
              <View style={[styles.dot, { backgroundColor: usageColor }]} />
              <Text style={[Typography.body, { color: colors.text, flex: 1 }]}>Used</Text>
              <Text style={[Typography.bodyMedium, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
                {formatNumber(used)}
              </Text>
              <Text style={[Typography.caption, { color: colors.textMuted, marginLeft: Spacing.xs }]}>
                tokens
              </Text>
            </View>

            <View style={styles.statRow}>
              <View style={[styles.dot, { backgroundColor: colors.border }]} />
              <Text style={[Typography.body, { color: colors.text, flex: 1 }]}>Total</Text>
              <Text style={[Typography.bodyMedium, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
                {formatNumber(total)}
              </Text>
              <Text style={[Typography.caption, { color: colors.textMuted, marginLeft: Spacing.xs }]}>
                tokens
              </Text>
            </View>

            {modelName && (
              <View style={styles.statRow}>
                <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
                <Text style={[Typography.body, { color: colors.text, flex: 1 }]}>Model</Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: colors.textMuted, fontFamily: 'monospace', maxWidth: '50%' },
                  ]}
                  numberOfLines={1}>
                  {modelName}
                </Text>
              </View>
            )}
          </View>

          {/* ── Close button ── */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeRow,
              { backgroundColor: pressed ? colors.surfaceSelected : 'transparent' },
            ]}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: colors.text, flex: 1, textAlign: 'center' },
              ]}>
              Close
            </Text>
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
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  chartArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  statsSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  closeRow: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
});
