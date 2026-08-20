/**
 * src/data/webMemoryStore.ts
 *
 * A localStorage-backed store for the web target.
 *
 * expo-sqlite has no web implementation in SDK 51 — `openDatabaseAsync` throws
 * `Unimplemented` — so running the app in a browser for design review would
 * otherwise land straight in the error state. Metro resolves `*.web.ts` ahead of
 * `*.ts` when bundling for web, so the three repositories each have a web sibling
 * that talks to these tables instead of SQL. Native is untouched.
 *
 * This is a preview/review convenience, not a second production backend: it holds
 * everything in memory and mirrors it to localStorage on write.
 */
import type { DoseLog, Medication } from '../domain/types';
import type { NotificationRecord } from './repositories/notificationRegistryRepo';

const STORAGE_KEY = 'med-capsule:web-store:v1';

type Tables = {
  medications: Medication[];
  doseLogs: DoseLog[];
  notifications: NotificationRecord[];
};

function emptyTables(): Tables {
  return { medications: [], doseLogs: [], notifications: [] };
}

let tables: Tables | null = null;

function storage(): Storage | null {
  try {
    // Guarded: Safari in private mode throws on access, not just on write.
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function load(): Tables {
  if (tables) return tables;

  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) {
    tables = emptyTables();
    return tables;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Tables>;
    tables = {
      medications: parsed.medications ?? [],
      doseLogs: parsed.doseLogs ?? [],
      notifications: parsed.notifications ?? [],
    };
  } catch {
    // A corrupt blob should not brick the preview.
    tables = emptyTables();
  }
  return tables;
}

export function persist(): void {
  const current = load();
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Quota or private mode — the in-memory copy still works for this session.
  }
}

export function resetWebStore(): void {
  tables = emptyTables();
  persist();
}
