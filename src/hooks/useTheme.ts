import { useColorScheme } from 'react-native';

import { Colors, type Mode } from '@/constants/theme';
import { useSettingsStore } from '@/features/settings/settings.store';

/**
 * Resolves the effective color mode from the user's preference (persisted)
 * and the system scheme, and returns the matching color tokens.
 */
export function useTheme() {
  const preference = useSettingsStore((s) => s.themePreference);
  const systemScheme = useColorScheme();

  const effective: Mode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return {
    mode: effective,
    preference,
    colors: Colors[effective],
    isDark: effective === 'dark',
  };
}

export type Theme = ReturnType<typeof useTheme>;
