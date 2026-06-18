import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  onPress?: () => void;
  hitSlop?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** When set, renders a filled circle/surface behind the icon. */
  surface?: boolean;
  color?: string;
  style?: ViewStyle;
}

export function IconButton({
  name,
  size = 24,
  onPress,
  hitSlop = 12,
  disabled = false,
  accessibilityLabel,
  surface = false,
  color,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const tint = color ?? colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [
        surface && { backgroundColor: colors.surface, borderRadius: Radius.pill },
        { opacity: disabled ? 0.4 : pressed ? 0.5 : 1 },
        styles.base,
        style,
      ]}>
      <Ionicons name={name} size={size} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
