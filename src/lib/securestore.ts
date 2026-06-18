import * as SecureStore from 'expo-secure-store';

const KEY = 'openrouter_api_key';

/**
 * The API key is the only secret. It lives exclusively in the device
 * Keychain/Keystore via SecureStore — never in AsyncStorage, SQLite,
 * logs, or the JS bundle.
 */

export async function saveApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error('API key cannot be empty');
  await SecureStore.setItemAsync(KEY, trimmed, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function deleteApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* already gone */
  }
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key && key.length > 0;
}

/** Returns the key with all but the last 4 characters masked. */
export async function getMaskedApiKey(): Promise<string> {
  const key = await getApiKey();
  if (!key) return '';
  if (key.length <= 4) return '••••';
  return '•'.repeat(Math.min(key.length - 4, 24)) + key.slice(-4);
}
