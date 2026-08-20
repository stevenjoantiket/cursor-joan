/**
 * Web sibling of doseLogRepo. Enforces the same uniqueness rule as the SQL
 * index over (medicationId, date, scheduledTime): one log per scheduled dose.
 */
import { load, persist } from '../webMemoryStore';
import { createId } from '../../utils/id';
import type { DoseLog, IsoDate } from '../../domain/types';

export type DoseLogInput = {
  medicationId: string;
  date: IsoDate;
  scheduledTime: string;
  status: DoseLog['status'];
  snoozedUntil?: number | null;
};

export async function listLogsForDate(date: IsoDate): Promise<DoseLog[]> {
  return load().doseLogs.filter((log) => log.date === date);
}

export async function listLogsBetween(start: IsoDate, end: IsoDate): Promise<DoseLog[]> {
  return load()
    .doseLogs.filter((log) => log.date >= start && log.date <= end)
    .sort((a, b) => (a.date + a.scheduledTime).localeCompare(b.date + b.scheduledTime));
}

export async function listLogsForMedication(medicationId: string): Promise<DoseLog[]> {
  return load()
    .doseLogs.filter((log) => log.medicationId === medicationId)
    .sort((a, b) => (a.date + a.scheduledTime).localeCompare(b.date + b.scheduledTime));
}

export async function upsertDoseLog(input: DoseLogInput): Promise<DoseLog> {
  const table = load().doseLogs;
  const existing = table.find(
    (log) =>
      log.medicationId === input.medicationId &&
      log.date === input.date &&
      log.scheduledTime === input.scheduledTime,
  );

  if (existing) {
    existing.status = input.status;
    existing.loggedAt = Date.now();
    existing.snoozedUntil = input.snoozedUntil ?? null;
    persist();
    return existing;
  }

  const log: DoseLog = {
    id: createId('log'),
    medicationId: input.medicationId,
    date: input.date,
    scheduledTime: input.scheduledTime,
    status: input.status,
    loggedAt: Date.now(),
    snoozedUntil: input.snoozedUntil ?? null,
  };
  table.push(log);
  persist();
  return log;
}

export async function deleteDoseLog(
  medicationId: string,
  date: IsoDate,
  scheduledTime: string,
): Promise<void> {
  const store = load();
  store.doseLogs = store.doseLogs.filter(
    (log) =>
      !(log.medicationId === medicationId && log.date === date && log.scheduledTime === scheduledTime),
  );
  persist();
}

export async function countByStatus(medicationId: string): Promise<Record<string, number>> {
  return load()
    .doseLogs.filter((log) => log.medicationId === medicationId)
    .reduce<Record<string, number>>((accumulator, log) => {
      accumulator[log.status] = (accumulator[log.status] ?? 0) + 1;
      return accumulator;
    }, {});
}
