/**
 * src/domain/schedule.ts
 *
 * The scheduling engine. Given a medication and a calendar day it answers:
 * "which doses are due, at what times, and what is each one's status?"
 *
 * Design decisions worth knowing:
 *
 * 1. Nothing is precomputed into the database. Occurrences are derived on demand
 *    from (schedule, duration, logs). That keeps editing a medication trivial —
 *    there are no stale future rows to migrate — and it means the timeline can
 *    render any day, past or future, from the same code path.
 *
 * 2. Interval schedules resolve to a fixed set of daily times. "Every 4 hours
 *    from 08:00" becomes 08:00, 12:00, 16:00, 20:00, 00:00, 04:00 — the same set
 *    every day. This is what users expect from a pill reminder (a repeating daily
 *    rhythm), and crucially it lets us register *repeating daily* OS
 *    notifications instead of thousands of one-shot ones. Intervals that do not
 *    divide 24 evenly (e.g. every 5 hours) are walked forward from the anchor and
 *    truncated at midnight, so no dose ever lands on the wrong calendar day.
 *
 * 3. `pending` vs `missed` is a function of the current time, not stored state. A
 *    dose is `missed` only once it is past its grace window and still unlogged,
 *    so nothing needs a background job to mark it.
 */
import type {
  AdherenceSummary,
  ClockTime,
  DoseLog,
  DoseOccurrence,
  DoseStatus,
  IsoDate,
  Medication,
  Schedule,
} from './types';
import {
  addDays,
  clockTimeFromMinutes,
  combine,
  daysBetween,
  isWithin,
  minutesOfDay,
  toIsoDate,
} from '../utils/date';

/** How long after its scheduled time a dose stays `pending` before it is `missed`. */
export const MISSED_GRACE_MINUTES = 90;

/** Default dose times per frequency mode, chosen to suit ordinary waking hours. */
export const defaultTimesForMode: Record<Schedule['mode'], ClockTime[]> = {
  'once-daily': ['09:00'],
  'twice-daily': ['09:00', '21:00'],
  'thrice-daily': ['08:00', '14:00', '20:00'],
  interval: ['08:00'],
  'custom-times': ['09:00'],
};

/**
 * Resolves a schedule to the sorted, de-duplicated list of times it fires each
 * day. This is the single place frequency is interpreted.
 */
export function resolveDailyTimes(schedule: Schedule): ClockTime[] {
  if (schedule.mode !== 'interval') {
    return dedupeSorted(schedule.times);
  }

  const intervalHours = schedule.intervalHours ?? 8;
  const anchor = schedule.anchorTime ?? schedule.times[0] ?? '08:00';

  if (!Number.isFinite(intervalHours) || intervalHours <= 0) return dedupeSorted([anchor]);
  // An interval of a day or more is just a single daily dose at the anchor.
  if (intervalHours >= 24) return [anchor];

  const stepMinutes = Math.round(intervalHours * 60);
  const anchorMinutes = minutesOfDay(anchor);
  const times: ClockTime[] = [];

  // Walk backward from the anchor to the start of the day, then forward, so the
  // early-hours doses of a tight interval are not lost.
  for (let minutes = anchorMinutes; minutes >= 0; minutes -= stepMinutes) {
    times.push(clockTimeFromMinutes(minutes));
  }
  for (let minutes = anchorMinutes + stepMinutes; minutes < 1440; minutes += stepMinutes) {
    times.push(clockTimeFromMinutes(minutes));
  }

  return dedupeSorted(times);
}

function dedupeSorted(times: ClockTime[]): ClockTime[] {
  return Array.from(new Set(times.filter(Boolean))).sort(
    (a, b) => minutesOfDay(a) - minutesOfDay(b),
  );
}

/** Doses per day for a schedule — used for inventory projection and summaries. */
export function dosesPerDay(schedule: Schedule): number {
  return resolveDailyTimes(schedule).length;
}

/** True when the medication is meant to be taken on this calendar day. */
export function isActiveOn(medication: Medication, date: IsoDate): boolean {
  if (medication.status === 'archived') return false;
  return isWithin(date, medication.duration.startDate, medication.duration.endDate);
}

/**
 * A dose's status, derived from its log and the current time.
 *
 * A snooze that has already elapsed reverts to `pending` (or `missed`) so the
 * dose comes back to the top of the timeline rather than sitting silently in a
 * snoozed state forever.
 */
export function resolveDoseStatus(
  date: IsoDate,
  time: ClockTime,
  log: DoseLog | null,
  now: Date = new Date(),
): DoseStatus {
  if (log) {
    if (log.status === 'snoozed') {
      const until = log.snoozedUntil ?? 0;
      if (until > now.getTime()) return 'snoozed';
      // The snooze has run out — fall through to the time-based decision below.
    } else {
      return log.status;
    }
  }

  const scheduledAt = combine(date, time).getTime();
  const graceMs = MISSED_GRACE_MINUTES * 60_000;
  return now.getTime() > scheduledAt + graceMs ? 'missed' : 'pending';
}

/** Every dose of one medication on one day, with status resolved. */
export function occurrencesFor(
  medication: Medication,
  date: IsoDate,
  logs: DoseLog[],
  now: Date = new Date(),
): DoseOccurrence[] {
  if (!isActiveOn(medication, date)) return [];

  const logsForDay = new Map<string, DoseLog>();
  for (const log of logs) {
    if (log.medicationId === medication.id && log.date === date) {
      logsForDay.set(log.scheduledTime, log);
    }
  }

  return resolveDailyTimes(medication.schedule).map((time) => {
    const log = logsForDay.get(time) ?? null;
    return {
      key: doseKey(medication.id, date, time),
      medication,
      date,
      scheduledTime: time,
      status: resolveDoseStatus(date, time, log, now),
      log,
      scheduledAt: combine(date, time).getTime(),
    };
  });
}

export function doseKey(medicationId: string, date: IsoDate, time: ClockTime): string {
  return `${medicationId}|${date}|${time}`;
}

/**
 * The full timeline for a day across all medications, sorted by time. Doses at
 * the same time are grouped in name order so the list is stable between renders.
 */
export function buildDayTimeline(
  medications: Medication[],
  date: IsoDate,
  logs: DoseLog[],
  now: Date = new Date(),
): DoseOccurrence[] {
  return medications
    .flatMap((medication) => occurrencesFor(medication, date, logs, now))
    .sort((a, b) => {
      const byTime = minutesOfDay(a.scheduledTime) - minutesOfDay(b.scheduledTime);
      if (byTime !== 0) return byTime;
      return a.medication.name.localeCompare(b.medication.name);
    });
}

/**
 * The next dose still to take today, or null. Drives the dashboard's "up next"
 * banner. A snoozed dose counts as upcoming — that is the point of snoozing.
 */
export function nextUpcomingDose(timeline: DoseOccurrence[], now: Date = new Date()): DoseOccurrence | null {
  const nowMs = now.getTime();
  const candidates = timeline.filter(
    (dose) =>
      (dose.status === 'pending' && dose.scheduledAt >= nowMs - MISSED_GRACE_MINUTES * 60_000) ||
      dose.status === 'snoozed',
  );
  return candidates[0] ?? null;
}

/** Adherence over a date range, inclusive. */
export function adherenceOver(
  medications: Medication[],
  logs: DoseLog[],
  startDate: IsoDate,
  endDate: IsoDate,
  now: Date = new Date(),
): AdherenceSummary {
  const summary: AdherenceSummary = { taken: 0, skipped: 0, missed: 0, pending: 0, total: 0, rate: 0 };
  const span = daysBetween(startDate, endDate);
  if (span < 0) return summary;

  for (let offset = 0; offset <= span; offset += 1) {
    const date = addDays(startDate, offset);
    for (const medication of medications) {
      // Archived courses still count toward history for the days they covered.
      const wasActive = isWithin(date, medication.duration.startDate, medication.duration.endDate);
      if (!wasActive) continue;

      for (const dose of occurrencesFor({ ...medication, status: 'active' }, date, logs, now)) {
        summary.total += 1;
        if (dose.status === 'taken') summary.taken += 1;
        else if (dose.status === 'skipped') summary.skipped += 1;
        else if (dose.status === 'missed') summary.missed += 1;
        else summary.pending += 1;
      }
    }
  }

  const resolved = summary.taken + summary.skipped + summary.missed;
  summary.rate = resolved === 0 ? 0 : summary.taken / resolved;
  return summary;
}

/** Adherence for a single medication over its whole course so far. */
export function adherenceForMedication(
  medication: Medication,
  logs: DoseLog[],
  now: Date = new Date(),
): AdherenceSummary {
  const today = toIsoDate(now);
  const start = medication.duration.startDate;
  // Never count days beyond today, or the rate would be dragged down by the future.
  const end = medication.duration.endDate === null
    ? today
    : medication.duration.endDate < today
      ? medication.duration.endDate
      : today;

  if (end < start) {
    return { taken: 0, skipped: 0, missed: 0, pending: 0, total: 0, rate: 0 };
  }
  return adherenceOver([medication], logs, start, end, now);
}

/**
 * A human sentence describing the schedule, e.g.
 * "Twice a day at 9:00 AM and 9:00 PM" / "Every 4 hours".
 * Used on cards and read aloud by screen readers.
 */
export function describeSchedule(schedule: Schedule, use24Hour = false): string {
  const times = resolveDailyTimes(schedule);
  const formatted = times.map((time) => formatTimeForSentence(time, use24Hour));

  if (schedule.mode === 'interval') {
    const hours = schedule.intervalHours ?? 8;
    const plural = hours === 1 ? 'hour' : 'hours';
    return `Every ${formatNumber(hours)} ${plural} · ${times.length}× a day`;
  }

  const countWord =
    times.length === 1 ? 'Once a day'
    : times.length === 2 ? 'Twice a day'
    : times.length === 3 ? 'Three times a day'
    : `${times.length} times a day`;

  return `${countWord} at ${joinWithAnd(formatted)}`;
}

function formatTimeForSentence(time: ClockTime, use24Hour: boolean): string {
  const [rawHours, rawMinutes] = time.split(':').map(Number);
  const hours = rawHours ?? 0;
  const minutes = rawMinutes ?? 0;
  if (use24Hour) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const period = hours < 12 ? 'AM' : 'PM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] as string;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
