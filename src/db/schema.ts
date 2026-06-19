import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Local SQLite schema. Two tables + one index, per the data model in PLAN.md.
 * `settings` are kept in AsyncStorage (theme/model prefs), so no table here.
 *
 * Migration history:
 *   v1 (initial) — chats(id, title, created_at, updated_at)
 *   v2 — added  provider  column to chats
 */

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY NOT NULL,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(chat_id, created_at)`,
];

/** Idempotent schema migrations. Safe to call on every launch. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.execAsync(sql);
  }

  // v2: add provider column to chats if not present.
  try {
    await db.execAsync(`ALTER TABLE chats ADD COLUMN provider TEXT NOT NULL DEFAULT 'openrouter'`);
  } catch {
    // Column already exists — ignore.
  }

  // Enforce cascade deletes at runtime (SQLite needs PRAGMA per connection).
  await db.execAsync('PRAGMA foreign_keys = ON;');
}
