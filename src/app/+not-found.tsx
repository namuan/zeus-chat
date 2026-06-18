import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={[Typography.title, { color: colors.text }]}>Not found</Text>
      <Text style={[Typography.body, { color: colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
        This screen doesn’t exist.
      </Text>
      <View style={{ marginTop: Spacing.lg }}>
        <Button label="Back to chats" onPress={() => router.replace('/(tabs)/chats')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
});
