import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from '@/db/schema';

const DB_NAME = 'zeus.db';

/**
 * Module-level singleton. The DB is opened once and shared; concurrent
 * callers await the same promise so we never open two handles.
 */
let dbPromise: Promise<SQLiteDatabase> | null = null;
let didMigrate = false;

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DB_NAME);
  if (!didMigrate) {
    await migrate(db);
    didMigrate = true;
  }
  return db;
}

/**
 * Returns the shared SQLite database, opening + migrating on first use.
 */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((err) => {
      // Allow a later call to retry.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** Warm up the database on app launch (fire-and-forget). */
export function initDb(): Promise<SQLiteDatabase> {
  return getDb();
}

export type { SQLiteDatabase };
