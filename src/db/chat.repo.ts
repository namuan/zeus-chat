import { getDb } from '@/lib/sqlite';
import { uuid } from '@/utils/ids';
import { now } from '@/utils/time';
import type { Chat, ChatWithPreview } from '@/features/chat/chat.types';

/** Insert a chat with a generated id (or a provided one). */
export async function createChat(title = 'New Chat', id?: string): Promise<Chat> {
  const db = await getDb();
  const chat: Chat = {
    id: id ?? uuid(),
    title,
    created_at: now(),
    updated_at: now(),
  };
  await db.runAsync(
    `INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`,
    chat.id,
    chat.title,
    chat.created_at,
    chat.updated_at,
  );
  return chat;
}

export async function getChat(id: string): Promise<Chat | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Chat>(
    `SELECT id, title, created_at, updated_at FROM chats WHERE id = ?`,
    id,
  );
  return row ?? null;
}

/** All chats newest-first, with a last-message preview. */
export async function listChats(): Promise<ChatWithPreview[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChatWithPreview>(`
    SELECT
      c.id AS id,
      c.title AS title,
      c.created_at AS created_at,
      c.updated_at AS updated_at,
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
    ORDER BY c.updated_at DESC, c.created_at DESC
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

export async function deleteChat(id: string): Promise<void> {
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

export async function countChats(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM chats`);
  return row?.c ?? 0;
}
