import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ContextPieChartProps {
  /** Number of tokens consumed so far. */
  used: number;
  /** Maximum context window in tokens (0 = unknown, hide chart). */
  total: number;
  /** Diameter in points (default 28 for header). */
  size?: number;
  /** Stroke width of the donut arcs (default 3). */
  strokeWidth?: number;
  /** Callback when the user taps the chart. */
  onPress?: () => void;
}

/**
 * A tiny donut-chart indicator showing current context usage vs the model's
 * maximum context window. Designed to sit in the navigation header.
 *
 * Colour-coded by usage level:
 *   0-50%   → green  (success)
 *   51-80%  → amber  (warning)
 *   81-100% → red    (danger)
 */
export function ContextPieChart({
  used,
  total,
  size = 28,
  strokeWidth = 3,
  onPress,
}: ContextPieChartProps) {
  const { colors } = useTheme();

  const percentage = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(used / total, 1);
  }, [used, total]);

  // SVG donut parameters
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);
  const center = size / 2;

  const arcColor = useMemo(() => {
    if (total <= 0) return colors.textMuted;
    if (percentage > 0.8) return colors.danger;
    if (percentage > 0.5) return colors.warning;
    return colors.success;
  }, [percentage, total, colors]);

  const unknown = total <= 0;

  const pctLabel = unknown ? '?' : percentage >= 0.01 ? `${Math.round(percentage * 100)}%` : '<1%';

  const content = (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track — full circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={unknown ? colors.hairline : colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Foreground arc — partial circle */}
        {percentage > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={arcColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center}, ${center}`}
          />
        )}
      </Svg>
      {/* Percentage label centred inside the donut */}
      <Text
        style={[
          styles.label,
          {
            color: arcColor,
            fontSize: Math.max(7, size * 0.3),
            lineHeight: Math.max(8, size * 0.35),
          },
        ]}
        numberOfLines={1}>
        {pctLabel}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="Context usage">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
