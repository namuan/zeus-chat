import { getDb } from '@/lib/sqlite';
import { uuid } from '@/utils/ids';
import { now } from '@/utils/time';
import type { ApiMessage, Message } from '@/features/chat/chat.types';

export async function insertMessage(
  msg: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: number },
): Promise<Message> {
  const db = await getDb();
  const full: Message = {
    id: msg.id ?? uuid(),
    chat_id: msg.chat_id,
    role: msg.role,
    content: msg.content,
    created_at: msg.created_at ?? now(),
    model: msg.model,
  };
  await db.runAsync(
    `INSERT INTO messages (id, chat_id, role, content, created_at, model) VALUES (?, ?, ?, ?, ?, ?)`,
    full.id,
    full.chat_id,
    full.role,
    full.content,
    full.created_at,
    full.model ?? null,
  );
  return full;
}

export async function listMessages(chatId: string): Promise<Message[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Message>(
    `SELECT id, chat_id, role, content, created_at, model
     FROM messages
     WHERE chat_id = ?
     ORDER BY created_at ASC, rowid ASC`,
    chatId,
  );
  return rows ?? [];
}

export async function getMessage(id: string): Promise<Message | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Message>(
    `SELECT id, chat_id, role, content, created_at, model FROM messages WHERE id = ?`,
    id,
  );
  return row ?? null;
}

export async function updateMessageContent(id: string, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE messages SET content = ? WHERE id = ?`, content, id);
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM messages WHERE id = ?`, id);
}

export async function deleteMessagesByChat(chatId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM messages WHERE chat_id = ?`, chatId);
}

/** Messages trimmed to the OpenRouter API shape, oldest-first. */
export async function getApiMessages(chatId: string): Promise<ApiMessage[]> {
  const messages = await listMessages(chatId);
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function getLastAssistantMessage(chatId: string): Promise<Message | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Message>(
    `SELECT id, chat_id, role, content, created_at, model
     FROM messages
     WHERE chat_id = ? AND role = 'assistant'
     ORDER BY created_at DESC, rowid DESC
     LIMIT 1`,
    chatId,
  );
  return row ?? null;
}

export async function getLastMessage(chatId: string): Promise<Message | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Message>(
    `SELECT id, chat_id, role, content, created_at, model
     FROM messages
     WHERE chat_id = ?
     ORDER BY created_at DESC, rowid DESC
     LIMIT 1`,
    chatId,
  );
  return row ?? null;
}
