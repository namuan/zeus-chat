import { deleteAllChats } from '@/db/chat.repo';
import { getDb } from '@/lib/sqlite';
import {
  deleteApiKey,
  getApiKey,
  getMaskedApiKey,
  hasApiKey,
  saveApiKey,
} from '@/lib/securestore';

/**
 * Settings-level operations that touch SecureStore / SQLite. Keeps screen
 * components free of storage details.
 */

export {
  getApiKey,
  getMaskedApiKey,
  hasApiKey,
  saveApiKey,
  deleteApiKey,
};

/** Wipe every local chat + message. The API key is left untouched. */
export async function deleteAllChatsData(): Promise<void> {
  await deleteAllChats();
}

/** Wipe chats, messages, AND the API key — full factory reset. */
export async function deleteEverything(): Promise<void> {
  await deleteAllChats();
  await deleteApiKey();
}

/** Compact JSON export of every chat + message, for backup/sharing. */
export async function exportAllDataJson(): Promise<string> {
  const db = await getDb();
  const chats = await db.getAllAsync<{ id: string; title: string; created_at: number; updated_at: number }>(
    `SELECT id, title, created_at, updated_at FROM chats ORDER BY updated_at DESC`,
  );
  const messages = await db.getAllAsync<{
    id: string;
    chat_id: string;
    role: string;
    content: string;
    created_at: number;
  }>(
    `SELECT id, chat_id, role, content, created_at FROM messages ORDER BY chat_id, created_at ASC`,
  );
  return JSON.stringify(
    {
      app: 'zeus-chat',
      exported_at: new Date().toISOString(),
      chats: chats ?? [],
      messages: messages ?? [],
    },
    null,
    2,
  );
}
