import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getProvider, getDefaultProvider, PROVIDERS } from '@/lib/providers/registry';
import { fetchAllModels } from '@/lib/providers/models';
import { getApiKey } from '@/lib/securestore';
import type { Mode } from '@/constants/theme';
import type { ModelInfo } from '@/lib/providers/types';

export type ThemePreference = 'system' | Mode;

interface SettingsState {
  /** Current provider id (e.g. 'openrouter' or 'requesty'). */
  provider: string;
  /** Per-provider model map: providerId → last-used model string. */
  models: Record<string, string>;
  /** User's appearance preference. `system` follows the OS. */
  themePreference: ThemePreference;
  /** Whether persisted state has been rehydrated yet. */
  hasHydrated: boolean;

  /** Models fetched from the active provider (non-persisted). */
  availableModels: ModelInfo[];
  /** Whether a model fetch is in flight. */
  modelsLoading: boolean;
  /** Human-readable error from the last model fetch, or null. */
  modelsError: string | null;

  setProvider: (id: string) => void;
  setModel: (model: string) => void;
  setThemePreference: (pref: ThemePreference) => void;
  setHydrated: (v: boolean) => void;
  reset: () => void;

  /** Fetch available models from the currently selected provider. */
  fetchAvailableModels: () => Promise<void>;
  /** Clear fetched model list (e.g. on provider switch). */
  clearAvailableModels: () => void;
}

/** Default models map so every known provider starts with its own default. */
function buildDefaultModels(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of Object.keys(PROVIDERS)) {
    map[id] = getProvider(id).defaultModel;
  }
  return map;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      provider: getDefaultProvider().id,
      models: buildDefaultModels(),
      themePreference: 'system',
      hasHydrated: false,

      availableModels: [],
      modelsLoading: false,
      modelsError: null,

      setProvider: (provider) => set({ provider }),

      setModel: (model) => {
        const { provider, models } = get();
        set({
          models: { ...models, [provider]: model.trim() || getProvider(provider).defaultModel },
        });
      },

      setThemePreference: (themePreference) => set({ themePreference }),
      setHydrated: (hasHydrated) => set({ hasHydrated }),
      reset: () =>
        set({
          provider: getDefaultProvider().id,
          models: buildDefaultModels(),
          themePreference: 'system',
        }),

      fetchAvailableModels: async () => {
        const { provider } = get();
        const cfg = getProvider(provider);
        if (!cfg.modelsUrl) {
          set({ modelsError: `${cfg.name} does not support listing models.`, availableModels: [], modelsLoading: false });
          return;
        }

        set({ modelsLoading: true, modelsError: null });

        try {
          const apiKey = await getApiKey(provider);
          const models = await fetchAllModels(cfg, apiKey);
          set({ availableModels: models, modelsLoading: false, modelsError: null });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load models.';
          set({ modelsError: message, availableModels: [], modelsLoading: false });
        }
      },

      clearAvailableModels: () => {
        set({ availableModels: [], modelsError: null });
      },
    }),
    {
      name: 'zeus-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        provider: s.provider,
        models: s.models,
        themePreference: s.themePreference,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // v1 → v2 migration: legacy `model` field moved into `models` map.
          // The old persist format saved `model` (a string), the new format
          // saves `models` (Record<string, string>) and `provider`.
          const legacyState = state as { model?: string };
          if (legacyState.model) {
            const provider = (state.provider || 'openrouter') as string;
            const currentModel = state.models?.[provider];
            // Only migrate if the provider hasn't already been customised.
            if (currentModel && currentModel !== getProvider(provider)?.defaultModel) {
              // Already customised — keep the existing value.
            } else {
              state.models = { ...(state.models ?? {}), [provider]: legacyState.model };
            }
            // Remove the legacy field so it doesn't cause confusion.
            delete (legacyState as Record<string, unknown>).model;
          }
          state.setHydrated(true);
        }
      },
    },
  ),
);
