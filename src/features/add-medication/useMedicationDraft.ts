/**
 * src/features/add-medication/useMedicationDraft.ts
 *
 * The draft state behind the add/edit flow, plus its validation.
 *
 * Validation lives here rather than in the step components so that "can the user
 * continue?" has one answer per step, and so the same rules apply whether the
 * medication is being created or edited.
 */
import { useCallback, useMemo, useState } from 'react';
import type { MedicineForm, MedicineInkName } from '@ds';
import type {
  DosageUnit,
  Duration,
  InstructionTagId,
  IsoDate,
  Medication,
  Schedule,
} from '../../domain/types';
import { defaultTimesForMode, resolveDailyTimes } from '../../domain/schedule';
import { suggestRefillThreshold } from '../../domain/inventory';
import { addDays, addMonths, toIsoDate } from '../../utils/date';

export type DurationPreset = '1-day' | '7-days' | '1-month' | 'ongoing' | 'custom';

export type MedicationDraft = {
  name: string;
  strength: string;
  form: MedicineForm;
  ink: MedicineInkName;
  dosageAmount: string;
  dosageUnit: DosageUnit;
  instructionTags: InstructionTagId[];
  schedule: Schedule;
  durationPreset: DurationPreset;
  startDate: IsoDate;
  /** Only consulted when the preset is 'custom'. */
  customEndDate: IsoDate | null;
  trackInventory: boolean;
  inventoryCount: string;
  refillThreshold: string;
  notes: string;
};

export const ADD_STEPS = ['identity', 'dosage', 'schedule', 'review'] as const;
export type AddStep = (typeof ADD_STEPS)[number];

export const stepTitles: Record<AddStep, { title: string; subtitle: string }> = {
  identity: { title: 'What are you taking?', subtitle: 'Name it, then pick the shape and colour so it is easy to recognise.' },
  dosage: { title: 'How much, and how?', subtitle: 'Set the dose and add any instructions from the label.' },
  schedule: { title: 'When do you take it?', subtitle: 'Choose how often and for how long.' },
  review: { title: 'Check it over', subtitle: 'Confirm the details before we start reminding you.' },
};

function emptyDraft(): MedicationDraft {
  return {
    name: '',
    strength: '',
    form: 'round',
    ink: 'white',
    dosageAmount: '1',
    dosageUnit: 'pill',
    instructionTags: [],
    schedule: { mode: 'once-daily', times: defaultTimesForMode['once-daily'] },
    durationPreset: '7-days',
    startDate: toIsoDate(),
    customEndDate: null,
    trackInventory: false,
    inventoryCount: '30',
    refillThreshold: '7',
    notes: '',
  };
}

/** Turns an existing medication back into an editable draft. */
export function draftFromMedication(medication: Medication): MedicationDraft {
  const { startDate, endDate } = medication.duration;
  return {
    name: medication.name,
    strength: medication.strength ?? '',
    form: medication.form,
    ink: medication.ink,
    dosageAmount: String(medication.dosageAmount),
    dosageUnit: medication.dosageUnit,
    instructionTags: medication.instructionTags,
    schedule: medication.schedule,
    durationPreset: endDate === null ? 'ongoing' : 'custom',
    startDate,
    customEndDate: endDate,
    trackInventory: medication.inventoryCount !== null,
    inventoryCount: String(medication.inventoryCount ?? 30),
    refillThreshold: String(medication.refillThreshold),
    notes: medication.notes ?? '',
  };
}

/** Resolves the duration preset into concrete dates. */
export function resolveDuration(draft: MedicationDraft): Duration {
  const { startDate, durationPreset, customEndDate } = draft;

  switch (durationPreset) {
    case '1-day':
      // Inclusive: a one-day course starts and ends on the same day.
      return { startDate, endDate: startDate };
    case '7-days':
      return { startDate, endDate: addDays(startDate, 6) };
    case '1-month':
      return { startDate, endDate: addDays(addMonths(startDate, 1), -1) };
    case 'ongoing':
      return { startDate, endDate: null };
    case 'custom':
      return { startDate, endDate: customEndDate };
    default:
      return { startDate, endDate: null };
  }
}

export type FieldErrors = Partial<Record<'name' | 'dosageAmount' | 'times' | 'interval' | 'endDate' | 'inventory', string>>;

export function validateDraft(draft: MedicationDraft): FieldErrors {
  const errors: FieldErrors = {};

  if (draft.name.trim().length === 0) {
    errors.name = 'Give the medication a name so you can recognise it.';
  } else if (draft.name.trim().length > 60) {
    errors.name = 'Please keep the name under 60 characters.';
  }

  const amount = Number(draft.dosageAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.dosageAmount = 'Enter a dose greater than zero.';
  } else if (amount > 10_000) {
    errors.dosageAmount = 'That dose looks too large — please check the label.';
  }

  if (draft.schedule.mode === 'interval') {
    const hours = draft.schedule.intervalHours ?? 0;
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      errors.interval = 'Choose an interval between 1 and 24 hours.';
    }
  } else if (resolveDailyTimes(draft.schedule).length === 0) {
    errors.times = 'Add at least one time of day.';
  }

  const duration = resolveDuration(draft);
  if (draft.durationPreset === 'custom') {
    if (!duration.endDate) {
      errors.endDate = 'Pick the last day of the course.';
    } else if (duration.endDate < duration.startDate) {
      errors.endDate = 'The end date cannot be before the start date.';
    }
  }

  if (draft.trackInventory) {
    const count = Number(draft.inventoryCount);
    if (!Number.isFinite(count) || count < 0) {
      errors.inventory = 'Enter how many you have, or turn tracking off.';
    }
  }

  return errors;
}

/** Which errors block which step — so a step only blocks on its own fields. */
const stepFields: Record<AddStep, (keyof FieldErrors)[]> = {
  identity: ['name'],
  dosage: ['dosageAmount'],
  schedule: ['times', 'interval', 'endDate'],
  review: ['name', 'dosageAmount', 'times', 'interval', 'endDate', 'inventory'],
};

export function canAdvance(step: AddStep, errors: FieldErrors): boolean {
  return stepFields[step].every((field) => !errors[field]);
}

/** Builds the persistable medication from a validated draft. */
export function draftToMedicationInput(draft: MedicationDraft) {
  const duration = resolveDuration(draft);
  const amount = Number(draft.dosageAmount);
  const inventoryCount = draft.trackInventory ? Number(draft.inventoryCount) : null;
  const threshold = Number(draft.refillThreshold);

  return {
    name: draft.name.trim(),
    strength: draft.strength.trim() || undefined,
    form: draft.form,
    ink: draft.ink,
    dosageAmount: Number.isFinite(amount) ? amount : 1,
    dosageUnit: draft.dosageUnit,
    instructionTags: draft.instructionTags,
    schedule: draft.schedule,
    duration,
    inventoryCount: inventoryCount !== null && Number.isFinite(inventoryCount) ? inventoryCount : null,
    refillThreshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 5,
    notes: draft.notes.trim() || undefined,
  };
}

export function useMedicationDraft(initial?: Medication) {
  const [draft, setDraft] = useState<MedicationDraft>(() =>
    initial ? draftFromMedication(initial) : emptyDraft(),
  );

  const update = useCallback(<K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  /**
   * Changing frequency mode resets the times to that mode's sensible defaults —
   * carrying three times over into a once-daily schedule would silently keep
   * reminders the user thought they had removed.
   */
  const setFrequencyMode = useCallback((mode: Schedule['mode']) => {
    setDraft((current) => {
      if (mode === 'interval') {
        const anchor = current.schedule.times[0] ?? '08:00';
        return {
          ...current,
          schedule: { mode, times: [anchor], anchorTime: anchor, intervalHours: current.schedule.intervalHours ?? 8 },
        };
      }

      const keepExisting =
        mode === 'custom-times' && current.schedule.times.length > 0
          ? current.schedule.times
          : defaultTimesForMode[mode];

      return { ...current, schedule: { mode, times: keepExisting } };
    });
  }, []);

  const setTimes = useCallback((times: string[]) => {
    setDraft((current) => ({ ...current, schedule: { ...current.schedule, times } }));
  }, []);

  const setInterval = useCallback((intervalHours: number, anchorTime?: string) => {
    setDraft((current) => ({
      ...current,
      schedule: {
        mode: 'interval',
        times: [anchorTime ?? current.schedule.anchorTime ?? '08:00'],
        intervalHours,
        anchorTime: anchorTime ?? current.schedule.anchorTime ?? '08:00',
      },
    }));
  }, []);

  const toggleInstructionTag = useCallback((id: InstructionTagId) => {
    setDraft((current) => ({
      ...current,
      instructionTags: current.instructionTags.includes(id)
        ? current.instructionTags.filter((tag) => tag !== id)
        : [...current.instructionTags, id],
    }));
  }, []);

  /** Re-suggests the refill threshold from the current schedule and dose. */
  const suggestThreshold = useCallback(() => {
    setDraft((current) => ({
      ...current,
      refillThreshold: String(
        suggestRefillThreshold({
          schedule: current.schedule,
          dosageAmount: Number(current.dosageAmount) || 1,
          dosageUnit: current.dosageUnit,
        }),
      ),
    }));
  }, []);

  const errors = useMemo(() => validateDraft(draft), [draft]);

  return {
    draft,
    errors,
    update,
    setFrequencyMode,
    setTimes,
    setInterval,
    toggleInstructionTag,
    suggestThreshold,
    resolvedDuration: useMemo(() => resolveDuration(draft), [draft]),
    dailyTimes: useMemo(() => resolveDailyTimes(draft.schedule), [draft.schedule]),
  };
}
