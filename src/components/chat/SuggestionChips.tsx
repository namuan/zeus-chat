import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const CHIP_HEIGHT = 36;

interface SuggestionChipsProps {
  suggestions: string[];
  isLoading: boolean;
  onTap: (suggestion: string) => void;
}

function SkeletonChip() {
  const { colors } = useTheme();
  const op = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [op]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.surfaceSelected,
          opacity: op,
        },
      ]}
    />
  );
}

export function SuggestionChips({ suggestions, isLoading, onTap }: SuggestionChipsProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <SkeletonChip />
          <SkeletonChip />
          <SkeletonChip />
        </View>
      </View>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Follow-up</Text>
      <View style={styles.row}>
        {suggestions.map((suggestion, index) => (
          <Pressable
            key={`suggestion-${index}`}
            onPress={() => onTap(suggestion)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: pressed ? colors.surfaceSelected : colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={2}>
              {suggestion}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm + 2,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '100%',
  },
  chipText: {
    ...Typography.caption,
    fontWeight: '500',
  },
  skeleton: {
    height: CHIP_HEIGHT,
    width: 100,
    borderRadius: Radius.pill,
  },
});
