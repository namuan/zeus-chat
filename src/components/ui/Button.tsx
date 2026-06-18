import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const block = variant === 'primary';
  const faded = disabled || loading;

  const bg =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.dangerSurface
        : variant === 'secondary'
          ? colors.surface
          : 'transparent';

  const fg =
    variant === 'primary'
      ? colors.accentText
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.text
          : colors.accent;

  const border =
    variant === 'secondary' || variant === 'ghost' ? colors.border : 'transparent';

  const padV = size === 'lg' ? Spacing.lg : Spacing.md;
  const padH = size === 'lg' ? Spacing.xxl : Spacing.lg;

  return (
    <Pressable
      onPress={onPress}
      disabled={faded}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingVertical: padV,
          paddingHorizontal: padH,
          opacity: faded ? 0.55 : pressed ? (block ? 0.88 : 0.6) : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[Typography.bodyMedium, { color: fg, textAlign: 'center' }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
