/**
 * src/data/repositories/notificationRegistryRepo.ts
 *
 * Maps OS notification identifiers back to the dose that created them.
 *
 * Without this, editing a schedule would mean either cancelling *all* the app's
 * notifications and rebuilding them, or leaving orphaned reminders that fire for
 * times the user has since removed. With it, a schedule change cancels exactly
 * the identifiers belonging to that medication.
 */
import { getDatabase } from '../db';

export type NotificationRecord = {
  identifier: string;
  medicationId: string;
  scheduledTime: string;
  kind: 'daily' | 'oneshot';
  firesAt: number | null;
};

type NotificationRow = {
  identifier: string;
  medication_id: string;
  scheduled_time: string;
  kind: string;
  fires_at: number | null;
};

function rowToRecord(row: NotificationRow): NotificationRecord {
  return {
    identifier: row.identifier,
    medicationId: row.medication_id,
    scheduledTime: row.scheduled_time,
    kind: row.kind === 'oneshot' ? 'oneshot' : 'daily',
    firesAt: row.fires_at,
  };
}

export async function listNotificationsForMedication(
  medicationId: string,
): Promise<NotificationRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<NotificationRow>(
    `SELECT * FROM notification_registry WHERE medication_id = ?;`,
    [medicationId],
  );
  return rows.map(rowToRecord);
}

export async function listAllNotifications(): Promise<NotificationRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<NotificationRow>(`SELECT * FROM notification_registry;`);
  return rows.map(rowToRecord);
}

export async function recordNotifications(records: NotificationRecord[]): Promise<void> {
  if (records.length === 0) return;
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    for (const record of records) {
      await db.runAsync(
        `INSERT OR REPLACE INTO notification_registry
           (identifier, medication_id, scheduled_time, kind, fires_at)
         VALUES (?, ?, ?, ?, ?);`,
        [record.identifier, record.medicationId, record.scheduledTime, record.kind, record.firesAt],
      );
    }
  });
}

export async function forgetNotificationsForMedication(medicationId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM notification_registry WHERE medication_id = ?;`, [medicationId]);
}

export async function forgetNotification(identifier: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM notification_registry WHERE identifier = ?;`, [identifier]);
}

/** Drops one-shot records whose fire time has passed, keeping the table small. */
export async function pruneElapsedOneshots(now = Date.now()): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM notification_registry WHERE kind = 'oneshot' AND fires_at IS NOT NULL AND fires_at < ?;`,
    [now],
  );
}
