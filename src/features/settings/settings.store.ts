import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_MODEL } from '@/constants/theme';
import type { Mode } from '@/constants/theme';

export type ThemePreference = 'system' | Mode;

interface SettingsState {
  /** OpenRouter model id. Defaults to the plan's "free-router". */
  model: string;
  /** User's appearance preference. `system` follows the OS. */
  themePreference: ThemePreference;
  /** Whether persisted state has been rehydrated yet. */
  hasHydrated: boolean;

  setModel: (model: string) => void;
  setThemePreference: (pref: ThemePreference) => void;
  setHydrated: (v: boolean) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      model: DEFAULT_MODEL,
      themePreference: 'system',
      hasHydrated: false,

      setModel: (model) => set({ model: model.trim() || DEFAULT_MODEL }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setHydrated: (hasHydrated) => set({ hasHydrated }),
      reset: () => set({ model: DEFAULT_MODEL, themePreference: 'system' }),
    }),
    {
      name: 'zeus-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ model: s.model, themePreference: s.themePreference }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
