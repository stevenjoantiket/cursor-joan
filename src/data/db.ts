/**
 * src/data/db.ts
 *
 * SQLite via expo-sqlite. Chosen over AsyncStorage because the app queries by
 * date range and by medication — that is a relational access pattern, and doing
 * it over a JSON blob would mean loading every log into memory to render one day.
 *
 * Migrations are versioned with `user_version` and run once on open. Adding a
 * migration means appending to MIGRATIONS; never edit an existing entry.
 */
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'med-capsule.db';

/**
 * Ordered migration list. The array index + 1 is the schema version it produces.
 */
const MIGRATIONS: string[] = [
  // v1 — initial schema.
  `
  CREATE TABLE IF NOT EXISTS medications (
    id                TEXT PRIMARY KEY NOT NULL,
    name              TEXT NOT NULL,
    strength          TEXT,
    form              TEXT NOT NULL,
    ink               TEXT NOT NULL,
    dosage_amount     REAL NOT NULL,
    dosage_unit       TEXT NOT NULL,
    instruction_tags  TEXT NOT NULL DEFAULT '[]',
    schedule_mode     TEXT NOT NULL,
    schedule_times    TEXT NOT NULL DEFAULT '[]',
    interval_hours    REAL,
    anchor_time       TEXT,
    start_date        TEXT NOT NULL,
    end_date          TEXT,
    status            TEXT NOT NULL DEFAULT 'active',
    inventory_count   REAL,
    refill_threshold  REAL NOT NULL DEFAULT 5,
    notes             TEXT,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    archived_at       INTEGER
  );

  CREATE TABLE IF NOT EXISTS dose_logs (
    id              TEXT PRIMARY KEY NOT NULL,
    medication_id   TEXT NOT NULL,
    date            TEXT NOT NULL,
    scheduled_time  TEXT NOT NULL,
    status          TEXT NOT NULL,
    logged_at       INTEGER NOT NULL,
    snoozed_until   INTEGER,
    FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE
  );

  -- One log per scheduled dose. Re-logging the same dose is an upsert onto this.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_dose_logs_unique
    ON dose_logs (medication_id, date, scheduled_time);

  -- The dashboard's hot query: every log for a given day.
  CREATE INDEX IF NOT EXISTS idx_dose_logs_date ON dose_logs (date);

  CREATE INDEX IF NOT EXISTS idx_medications_status ON medications (status);
  `,

  // v2 — remembers which OS notification belongs to which dose time, so a
  // schedule edit can cancel exactly the right pending reminders.
  `
  CREATE TABLE IF NOT EXISTS notification_registry (
    identifier      TEXT PRIMARY KEY NOT NULL,
    medication_id   TEXT NOT NULL,
    scheduled_time  TEXT NOT NULL,
    /* 'daily' for a repeating trigger, 'oneshot' for a snooze or a dated dose. */
    kind            TEXT NOT NULL DEFAULT 'daily',
    fires_at        INTEGER,
    FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_notification_registry_medication
    ON notification_registry (medication_id);
  `,
];

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens the database, applying any outstanding migrations. Safe to call from
 * anywhere — the connection is created once and reused.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error) => {
      // Clear the cache so a later call can retry rather than reusing a
      // permanently rejected promise.
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // WAL keeps reads fast while a write is in flight; foreign_keys enforces the
  // cascade that cleans up logs when a medication is deleted.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < MIGRATIONS.length; version += 1) {
    const migration = MIGRATIONS[version];
    if (!migration) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration);
    });
    // PRAGMA cannot be parameterised, and `version + 1` is a loop counter.
    await db.execAsync(`PRAGMA user_version = ${version + 1};`);
  }

  return db;
}

/** Test / "clear all data" hook. Drops every row but keeps the schema. */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM notification_registry;');
    await db.execAsync('DELETE FROM dose_logs;');
    await db.execAsync('DELETE FROM medications;');
  });
}
