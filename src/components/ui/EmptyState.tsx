import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/** Friendly placeholder for a brand-new chat with no messages yet. */
export function EmptyState() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
      </View>
      <Text style={[Typography.heading, { color: colors.text, marginTop: Spacing.lg }]}>
        Start the conversation
      </Text>
      <Text style={[Typography.body, { color: colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
        Send a message below. Replies stream in live and stay on your device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
