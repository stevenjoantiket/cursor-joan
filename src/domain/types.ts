/**
 * src/domain/types.ts
 *
 * The app's data model. Two conventions hold everywhere:
 *   - A calendar day is a `YYYY-MM-DD` string in the user's local zone, never a
 *     Date, so a dose scheduled for "the 3rd" cannot drift across a timezone
 *     change or a DST boundary.
 *   - A time of day is a `HH:MM` 24-hour string.
 *
 * `MedicineForm` and `MedicineInkName` are re-exported from the design system:
 * the set of shapes and colours a user can pick is a *visual* decision, so the
 * design system owns it and the domain refers to it.
 */
import type { MedicineForm, MedicineInkName } from '@ds';

export type { MedicineForm, MedicineInkName };

/** `YYYY-MM-DD`, local calendar day. */
export type IsoDate = string;
/** `HH:MM`, 24-hour local time. */
export type ClockTime = string;

export type DosageUnit = 'mg' | 'ml' | 'pill' | 'drop' | 'puff' | 'unit' | 'sachet';

export const dosageUnits: { value: DosageUnit; label: string; plural: string }[] = [
  { value: 'mg', label: 'mg', plural: 'mg' },
  { value: 'ml', label: 'ml', plural: 'ml' },
  { value: 'pill', label: 'pills', plural: 'pills' },
  { value: 'drop', label: 'drops', plural: 'drops' },
  { value: 'puff', label: 'puffs', plural: 'puffs' },
  { value: 'unit', label: 'units', plural: 'units' },
  { value: 'sachet', label: 'sachets', plural: 'sachets' },
];

/** Instruction tags. Ids are stable — they are persisted. */
export type InstructionTagId =
  | 'before-food'
  | 'after-food'
  | 'with-food'
  | 'empty-stomach'
  | 'with-water'
  | 'morning'
  | 'bedtime'
  | 'avoid-alcohol'
  | 'do-not-crush';

export type FrequencyMode = 'once-daily' | 'twice-daily' | 'thrice-daily' | 'interval' | 'custom-times';

export type Schedule = {
  mode: FrequencyMode;
  /**
   * Explicit dose times. Authoritative for every mode except `interval`, where
   * it is derived from `anchorTime` + `intervalHours`.
   */
  times: ClockTime[];
  /** Hours between doses. Only meaningful when mode is `interval`. */
  intervalHours?: number;
  /** First dose of the day for an interval schedule. */
  anchorTime?: ClockTime;
};

export type Duration = {
  startDate: IsoDate;
  /**
   * Last day the medication is taken, inclusive. `null` means open-ended
   * ("ongoing") — such a course never auto-archives.
   */
  endDate: IsoDate | null;
};

export type MedicationStatus = 'active' | 'archived';

export type Medication = {
  id: string;
  name: string;
  /** Optional strength note shown under the name, e.g. "500 mg tablet". */
  strength?: string;
  form: MedicineForm;
  ink: MedicineInkName;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  instructionTags: InstructionTagId[];
  schedule: Schedule;
  duration: Duration;
  status: MedicationStatus;
  /** Total units on hand. `null` when the user is not tracking inventory. */
  inventoryCount: number | null;
  /** Warn at or below this many remaining units. */
  refillThreshold: number;
  notes?: string;
  /** Epoch ms. */
  createdAt: number;
  updatedAt: number;
  /** Set when the course ended or the user archived it manually. */
  archivedAt: number | null;
};

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'snoozed' | 'missed';

/**
 * A logged outcome for one scheduled dose. The (medicationId, date, time) triple
 * is unique — logging the same dose twice updates the existing row.
 */
export type DoseLog = {
  id: string;
  medicationId: string;
  /** The day the dose was scheduled for. */
  date: IsoDate;
  /** The time it was scheduled for — the dose's identity within the day. */
  scheduledTime: ClockTime;
  status: Exclude<DoseStatus, 'pending'>;
  /** Epoch ms of when the user actually logged it. */
  loggedAt: number;
  /** For a snooze: when it should fire again. Epoch ms. */
  snoozedUntil: number | null;
};

/**
 * One row on the dashboard timeline: a scheduled dose joined to its log, if any.
 * Built on the fly by the scheduling engine — never persisted.
 */
export type DoseOccurrence = {
  /** Stable within a day: `${medicationId}|${date}|${scheduledTime}`. */
  key: string;
  medication: Medication;
  date: IsoDate;
  scheduledTime: ClockTime;
  status: DoseStatus;
  log: DoseLog | null;
  /** Epoch ms of the scheduled moment, for sorting and notifications. */
  scheduledAt: number;
};

export type AdherenceSummary = {
  taken: number;
  skipped: number;
  missed: number;
  /** Scheduled but not yet due. */
  pending: number;
  total: number;
  /** taken / (taken + skipped + missed). 0 when nothing is resolved yet. */
  rate: number;
};
