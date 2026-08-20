/**
 * src/utils/date.ts
 *
 * Date handling for a medication app has one hard requirement: a dose scheduled
 * for 08:00 on the 3rd must stay 08:00 on the 3rd, whatever the device timezone
 * does. So calendar days are `YYYY-MM-DD` strings and times are `HH:MM` strings,
 * and we only build a Date when we need a real instant (sorting, notifications).
 *
 * Every function here is pure and timezone-local by design.
 */
import type { ClockTime, IsoDate } from '../domain/types';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local calendar day for a Date (or now). */
export function toIsoDate(date: Date = new Date()): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local `HH:MM` for a Date (or now). */
export function toClockTime(date: Date = new Date()): ClockTime {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses `YYYY-MM-DD` into a local Date at midnight. */
export function fromIsoDate(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
}

/** Combines a calendar day and a time of day into a real local instant. */
export function combine(date: IsoDate, time: ClockTime): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const base = fromIsoDate(date);
  base.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return base;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function addMonths(iso: IsoDate, months: number): IsoDate {
  const date = fromIsoDate(iso);
  const targetDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // Clamp so "31 Jan + 1 month" lands on 28/29 Feb rather than spilling into March.
  const lastDayOfTarget = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(targetDay, lastDayOfTarget));
  return toIsoDate(date);
}

/** Whole days from `a` to `b`. Negative when `b` is earlier. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const MS_PER_DAY = 86_400_000;
  // Compare at UTC noon so a DST shift can never round the difference off by one.
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const left = Date.UTC(ay ?? 0, (am ?? 1) - 1, ad ?? 1, 12);
  const right = Date.UTC(by ?? 0, (bm ?? 1) - 1, bd ?? 1, 12);
  return Math.round((right - left) / MS_PER_DAY);
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

export function isSameOrBefore(a: IsoDate, b: IsoDate): boolean {
  return a <= b;
}

/** Inclusive on both ends. `end === null` means open-ended. */
export function isWithin(date: IsoDate, start: IsoDate, end: IsoDate | null): boolean {
  if (date < start) return false;
  if (end === null) return true;
  return date <= end;
}

export function minutesOfDay(time: ClockTime): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function clockTimeFromMinutes(totalMinutes: number): ClockTime {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** "8:00 AM" — for display only; storage always uses 24-hour `HH:MM`. */
export function formatClockTime(time: ClockTime, use24Hour = false): string {
  const [rawHours, rawMinutes] = time.split(':').map(Number);
  const hours = rawHours ?? 0;
  const minutes = rawMinutes ?? 0;
  if (use24Hour) return `${pad(hours)}:${pad(minutes)}`;
  const period = hours < 12 ? 'AM' : 'PM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${pad(minutes)} ${period}`;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today", "Tomorrow", "Yesterday", else "Mon, 3 Sep". */
export function formatRelativeDay(iso: IsoDate, today: IsoDate = toIsoDate()): string {
  const delta = daysBetween(today, iso);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  const date = fromIsoDate(iso);
  return `${WEEKDAY_NAMES[date.getDay()]?.slice(0, 3)}, ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

/** "3 Sep 2026". */
export function formatLongDate(iso: IsoDate): string {
  const date = fromIsoDate(iso);
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Morning" / "Afternoon" / "Evening" / "Night" — used to group the timeline. */
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPartFor(time: ClockTime): DayPart {
  const minutes = minutesOfDay(time);
  if (minutes < 5 * 60) return 'night';
  if (minutes < 12 * 60) return 'morning';
  if (minutes < 17 * 60) return 'afternoon';
  if (minutes < 21 * 60) return 'evening';
  return 'night';
}

export const dayPartLabels: Record<DayPart, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};
