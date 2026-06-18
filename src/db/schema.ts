import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Local SQLite schema. Two tables + one index, per the data model in PLAN.md.
 * `settings` are kept in AsyncStorage (theme/model prefs), so no table here.
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

/**
 * Runs migrations. Idempotent — safe to call on every launch.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  for (const sql of SCHEMA_STATEMENTS) {
    await db.execAsync(sql);
  }
  // Enforce cascade deletes at runtime (SQLite needs PRAGMA per connection).
  await db.execAsync('PRAGMA foreign_keys = ON;');
}
