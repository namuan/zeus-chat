import type { ProviderConfig } from '@/lib/providers/types';
import { OPENROUTER_PROVIDER } from '@/lib/providers/configs/openrouter';
import { REQUESTY_PROVIDER } from '@/lib/providers/configs/requesty';

/** All supported providers, keyed by id. */
export const PROVIDERS: Record<string, ProviderConfig> = {
  openrouter: OPENROUTER_PROVIDER,
  requesty: REQUESTY_PROVIDER,
};

/** Ordered list of providers for UI display. */
export const PROVIDER_LIST: ProviderConfig[] = [
  OPENROUTER_PROVIDER,
  REQUESTY_PROVIDER,
];

/** Look up a provider by id. Throws if unknown. */
export function getProvider(id: string): ProviderConfig {
  const p = PROVIDERS[id];
  if (!p) {
    throw new Error(`Unknown provider "${id}". Valid: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return p;
}

/** The first provider is the default when nothing has been configured yet. */
export function getDefaultProvider(): ProviderConfig {
  return PROVIDER_LIST[0];
}
