import { getDb } from '@/lib/sqlite';
import { uuid } from '@/utils/ids';
import { now } from '@/utils/time';
import type { Chat, ChatWithPreview } from '@/features/chat/chat.types';

/** Insert a chat with a generated id (or a provided one). */
export async function createChat(title = 'New Chat', provider = 'openrouter', id?: string): Promise<Chat> {
  const db = await getDb();
  const chat: Chat = {
    id: id ?? uuid(),
    title,
    created_at: now(),
    updated_at: now(),
    provider,
  };
  await db.runAsync(
    `INSERT INTO chats (id, title, created_at, updated_at, provider) VALUES (?, ?, ?, ?, ?)`,
    chat.id,
    chat.title,
    chat.created_at,
    chat.updated_at,
    chat.provider,
  );
  return chat;
}

export async function getChat(id: string): Promise<Chat | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Chat>(
    `SELECT id, title, created_at, updated_at, provider, deleted_at FROM chats WHERE id = ?`,
    id,
  );
  return row ?? null;
}

/** Active (non-deleted) chats newest-first, with a last-message preview. */
export async function listChats(): Promise<ChatWithPreview[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChatWithPreview>(`
    SELECT
      c.id AS id,
      c.title AS title,
      c.created_at AS created_at,
      c.updated_at AS updated_at,
      c.provider AS provider,
      c.deleted_at AS deleted_at,
      (
        SELECT content FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC, m.rowid DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT role FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC, m.rowid DESC
        LIMIT 1
      ) AS last_role,
      (
        SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id
      ) AS message_count
    FROM chats c
    WHERE c.deleted_at IS NULL
    ORDER BY c.updated_at DESC, c.created_at DESC
  `);
  return rows ?? [];
}

/** Soft-deleted chats newest-first, with preview. */
export async function listDeletedChats(): Promise<ChatWithPreview[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChatWithPreview>(`
    SELECT
      c.id AS id,
      c.title AS title,
      c.created_at AS created_at,
      c.updated_at AS updated_at,
      c.provider AS provider,
      c.deleted_at AS deleted_at,
      (
        SELECT content FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC, m.rowid DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT role FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.created_at DESC, m.rowid DESC
        LIMIT 1
      ) AS last_role,
      (
        SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id
      ) AS message_count
    FROM chats c
    WHERE c.deleted_at IS NOT NULL
    ORDER BY c.deleted_at DESC, c.updated_at DESC
  `);
  return rows ?? [];
}

export async function renameChat(id: string, title: string): Promise<void> {
  const db = await getDb();
  const t = title.trim() || 'Untitled';
  await db.runAsync(`UPDATE chats SET title = ?, updated_at = ? WHERE id = ?`, t, now(), id);
}

/** Bump updated_at when a message is added. */
export async function touchChat(id: string, ts: number = now()): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE chats SET updated_at = ? WHERE id = ?`, ts, id);
}

/** Soft-delete: mark as deleted without removing data. */
export async function softDeleteChat(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE chats SET deleted_at = ?, updated_at = ? WHERE id = ?`, now(), now(), id);
}

/** Restore a soft-deleted chat back to active. */
export async function restoreChat(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE chats SET deleted_at = NULL, updated_at = ? WHERE id = ?`, now(), id);
}

/** Permanently delete a single chat and its messages. */
export async function permanentDeleteChat(id: string): Promise<void> {
  const db = await getDb();
  // Manual cascade (PRAGMA foreign_keys is on, but be explicit for safety).
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM messages WHERE chat_id = ?`, id);
    await db.runAsync(`DELETE FROM chats WHERE id = ?`, id);
  });
}

export async function deleteAllChats(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM messages`);
    await db.runAsync(`DELETE FROM chats`);
  });
}

/** Count active (non-deleted) chats. */
export async function countChats(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM chats WHERE deleted_at IS NULL`,
  );
  return row?.c ?? 0;
}

/** Count soft-deleted chats. */
export async function countDeletedChats(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM chats WHERE deleted_at IS NOT NULL`,
  );
  return row?.c ?? 0;
}

/** Permanently delete chats that were soft-deleted before the given timestamp. */
export async function purgeOldDeletedChats(before: number): Promise<number> {
  const db = await getDb();
  let purged = 0;
  await db.withTransactionAsync(async () => {
    const toDelete = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM chats WHERE deleted_at IS NOT NULL AND deleted_at < ?`,
      before,
    );
    purged = toDelete.length;
    if (purged > 0) {
      const ids = toDelete.map((r) => r.id);
      const placeholders = ids.map(() => '?').join(',');
      await db.runAsync(`DELETE FROM messages WHERE chat_id IN (${placeholders})`, ...ids);
      await db.runAsync(`DELETE FROM chats WHERE id IN (${placeholders})`, ...ids);
    }
  });
  return purged;
}
