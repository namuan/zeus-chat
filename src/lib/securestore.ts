import * as SecureStore from 'expo-secure-store';

import { PROVIDERS } from '@/lib/providers/registry';

const KEY_PREFIX = 'provider_api_key_';

function storageKey(providerId: string): string {
  return `${KEY_PREFIX}${providerId}`;
}

/**
 * Per-provider API keys. Each lives exclusively in the device Keychain/Keystore
 * via SecureStore — never in AsyncStorage, SQLite, logs, or the JS bundle.
 *
 * All functions accept an optional `providerId` (defaults to `'openrouter'`)
 * for backward compatibility with code that hasn't been updated yet.
 */

export async function saveApiKey(key: string, providerId = 'openrouter'): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error('API key cannot be empty');
  await SecureStore.setItemAsync(storageKey(providerId), trimmed, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function getApiKey(providerId = 'openrouter'): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(storageKey(providerId));
  } catch {
    return null;
  }
}

export async function deleteApiKey(providerId = 'openrouter'): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(storageKey(providerId));
  } catch {
    /* already gone */
  }
}

export async function hasApiKey(providerId = 'openrouter'): Promise<boolean> {
  const key = await getApiKey(providerId);
  return !!key && key.length > 0;
}

/** Returns the key with all but the last 4 characters masked. */
export async function getMaskedApiKey(providerId = 'openrouter'): Promise<string> {
  const key = await getApiKey(providerId);
  if (!key) return '';
  if (key.length <= 4) return '••••';
  return '•'.repeat(Math.min(key.length - 4, 24)) + key.slice(-4);
}

/** Check whether ANY known provider has an API key stored. */
export async function hasAnyApiKey(): Promise<boolean> {
  for (const providerId of Object.keys(PROVIDERS)) {
    const ok = await hasApiKey(providerId);
    if (ok) return true;
  }
  return false;
}

/** Wipe API keys for all known providers (used by "erase everything"). */
export async function deleteAllProviderKeys(): Promise<void> {
  for (const providerId of Object.keys(PROVIDERS)) {
    await deleteApiKey(providerId);
  }
}
