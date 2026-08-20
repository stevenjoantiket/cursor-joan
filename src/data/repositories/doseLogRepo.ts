/**
 * src/data/repositories/doseLogRepo.ts
 *
 * Dose logs. Writes go through `upsertDoseLog`, which relies on the unique index
 * over (medication_id, date, scheduled_time): tapping "Taken" twice, or changing
 * a decision from Taken to Skipped, updates one row instead of accumulating
 * duplicates that would skew adherence.
 */
import { getDatabase } from '../db';
import { createId } from '../../utils/id';
import type { DoseLog, IsoDate } from '../../domain/types';

type DoseLogRow = {
  id: string;
  medication_id: string;
  date: string;
  scheduled_time: string;
  status: string;
  logged_at: number;
  snoozed_until: number | null;
};

function rowToLog(row: DoseLogRow): DoseLog {
  return {
    id: row.id,
    medicationId: row.medication_id,
    date: row.date,
    scheduledTime: row.scheduled_time,
    status: row.status as DoseLog['status'],
    loggedAt: row.logged_at,
    snoozedUntil: row.snoozed_until,
  };
}

/** Logs for a single day — the dashboard's query. */
export async function listLogsForDate(date: IsoDate): Promise<DoseLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DoseLogRow>(`SELECT * FROM dose_logs WHERE date = ?;`, [date]);
  return rows.map(rowToLog);
}

/** Logs across an inclusive date range — the history and adherence queries. */
export async function listLogsBetween(start: IsoDate, end: IsoDate): Promise<DoseLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DoseLogRow>(
    `SELECT * FROM dose_logs WHERE date >= ? AND date <= ? ORDER BY date ASC, scheduled_time ASC;`,
    [start, end],
  );
  return rows.map(rowToLog);
}

export async function listLogsForMedication(medicationId: string): Promise<DoseLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DoseLogRow>(
    `SELECT * FROM dose_logs WHERE medication_id = ? ORDER BY date ASC, scheduled_time ASC;`,
    [medicationId],
  );
  return rows.map(rowToLog);
}

export type DoseLogInput = {
  medicationId: string;
  date: IsoDate;
  scheduledTime: string;
  status: DoseLog['status'];
  snoozedUntil?: number | null;
};

/**
 * Writes the outcome for one scheduled dose, replacing any previous decision for
 * that same dose.
 */
export async function upsertDoseLog(input: DoseLogInput): Promise<DoseLog> {
  const db = await getDatabase();
  const log: DoseLog = {
    id: createId('log'),
    medicationId: input.medicationId,
    date: input.date,
    scheduledTime: input.scheduledTime,
    status: input.status,
    loggedAt: Date.now(),
    snoozedUntil: input.snoozedUntil ?? null,
  };

  await db.runAsync(
    `INSERT INTO dose_logs (id, medication_id, date, scheduled_time, status, logged_at, snoozed_until)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (medication_id, date, scheduled_time) DO UPDATE SET
       status = excluded.status,
       logged_at = excluded.logged_at,
       snoozed_until = excluded.snoozed_until;`,
    [log.id, log.medicationId, log.date, log.scheduledTime, log.status, log.loggedAt, log.snoozedUntil],
  );

  // The conflict path keeps the original row id, so read back the live row.
  const row = await db.getFirstAsync<DoseLogRow>(
    `SELECT * FROM dose_logs WHERE medication_id = ? AND date = ? AND scheduled_time = ?;`,
    [log.medicationId, log.date, log.scheduledTime],
  );
  return row ? rowToLog(row) : log;
}

/** Clears a decision, returning the dose to pending. Used by "Undo". */
export async function deleteDoseLog(
  medicationId: string,
  date: IsoDate,
  scheduledTime: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM dose_logs WHERE medication_id = ? AND date = ? AND scheduled_time = ?;`,
    [medicationId, date, scheduledTime],
  );
}

/** Per-status counts for a medication — cheap enough to run on a detail screen. */
export async function countByStatus(medicationId: string): Promise<Record<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM dose_logs WHERE medication_id = ? GROUP BY status;`,
    [medicationId],
  );
  return rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.status] = row.count;
    return accumulator;
  }, {});
}
