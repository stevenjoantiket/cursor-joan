/**
 * src/domain/archive.ts
 *
 * Archive rules.
 *
 * A course archives itself the day after its end date passes — not on the end
 * date, because the final day's doses must stay on the dashboard until that day
 * is over. The sweep is idempotent and runs on every app foreground, so it never
 * needs a background job to be correct.
 *
 * Reactivating asks for a fresh duration rather than reusing the old dates: a
 * repeat prescription starts now, and silently resurrecting last month's dates
 * would create a course whose doses are all already in the past.
 */
import type { IsoDate, Medication } from './types';
import { addDays, daysBetween, toIsoDate } from '../utils/date';

/** True when today is past the medication's end date. */
export function hasCourseEnded(medication: Medication, today: IsoDate = toIsoDate()): boolean {
  const { endDate } = medication.duration;
  if (endDate === null) return false;
  return today > endDate;
}

/** The medications whose course has ended but which are still marked active. */
export function medicationsDueForArchive(
  medications: Medication[],
  today: IsoDate = toIsoDate(),
): Medication[] {
  return medications.filter(
    (medication) => medication.status === 'active' && hasCourseEnded(medication, today),
  );
}

/**
 * The duration a reactivated course should get: the same length as the original,
 * starting today. An open-ended course stays open-ended.
 */
export function reactivationDuration(
  medication: Medication,
  today: IsoDate = toIsoDate(),
): { startDate: IsoDate; endDate: IsoDate | null } {
  const { startDate, endDate } = medication.duration;
  if (endDate === null) return { startDate: today, endDate: null };

  // Inclusive length: a 1-day course has start === end.
  const lengthInDays = Math.max(0, daysBetween(startDate, endDate));
  return { startDate: today, endDate: addDays(today, lengthInDays) };
}

/** "Ended 3 days ago" / "Ends today" / "4 days left" — the card's status line. */
export function describeCourseProgress(medication: Medication, today: IsoDate = toIsoDate()): string {
  const { startDate, endDate } = medication.duration;

  if (today < startDate) {
    const daysUntil = daysBetween(today, startDate);
    return daysUntil === 1 ? 'Starts tomorrow' : `Starts in ${daysUntil} days`;
  }

  if (endDate === null) return 'Ongoing';

  const daysLeft = daysBetween(today, endDate);
  if (daysLeft < 0) {
    const daysAgo = Math.abs(daysLeft);
    return daysAgo === 1 ? 'Ended yesterday' : `Ended ${daysAgo} days ago`;
  }
  if (daysLeft === 0) return 'Last day';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

/** 0–1 progress through the course, for the ring on an archived card. */
export function courseProgress(medication: Medication, today: IsoDate = toIsoDate()): number {
  const { startDate, endDate } = medication.duration;
  if (endDate === null) return 0;

  const totalDays = daysBetween(startDate, endDate) + 1;
  if (totalDays <= 0) return 1;

  const elapsed = daysBetween(startDate, today) + 1;
  return Math.max(0, Math.min(1, elapsed / totalDays));
}
