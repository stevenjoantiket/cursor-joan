/**
 * src/data/devSeed.ts
 *
 * Demo data for design review. A fresh install shows the empty state, which tells
 * you nothing about how the timeline, pill artwork, badges or adherence figures
 * actually look — so this seeds a plausible day.
 *
 * Guard rails: it runs only when `__DEV__` is true AND the database is empty, and
 * it is called from exactly one place (the store's initial load). A production
 * build strips it, and it can never overwrite real records.
 */
import type { DoseLog, Medication } from '../domain/types';
import { resolveDailyTimes } from '../domain/schedule';
import { addDays, toIsoDate } from '../utils/date';
import { insertMedication, listMedications } from './repositories/medicationRepo';
import { upsertDoseLog } from './repositories/doseLogRepo';

/** Flip to false to preview the true first-run experience. */
export const SEED_DEMO_DATA = true;

type Seed = Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'status'>;

function buildSeeds(today: string): Seed[] {
  return [
    // A short antibiotic course, mid-flight — the classic case.
    {
      name: 'Amoxicillin',
      strength: '500 mg capsule',
      form: 'capsule',
      ink: 'pink',
      dosageAmount: 1,
      dosageUnit: 'pill',
      instructionTags: ['after-food', 'with-water'],
      schedule: { mode: 'thrice-daily', times: ['08:00', '14:00', '20:00'] },
      duration: { startDate: addDays(today, -3), endDate: addDays(today, 3) },
      inventoryCount: 12,
      refillThreshold: 9,
      notes: 'Finish the whole course even if you feel better.',
    },
    // An ongoing daily tablet with healthy stock.
    {
      name: 'Metformin',
      strength: '850 mg tablet',
      form: 'tablet',
      ink: 'white',
      dosageAmount: 1,
      dosageUnit: 'pill',
      instructionTags: ['with-food'],
      schedule: { mode: 'twice-daily', times: ['09:00', '21:00'] },
      duration: { startDate: addDays(today, -40), endDate: null },
      inventoryCount: 56,
      refillThreshold: 14,
    },
    // Interval dosing — exercises the derived-times path.
    {
      name: 'Ibuprofen',
      strength: '400 mg',
      form: 'oval',
      ink: 'orange',
      dosageAmount: 1,
      dosageUnit: 'pill',
      instructionTags: ['after-food', 'do-not-crush'],
      schedule: { mode: 'interval', times: ['08:00'], intervalHours: 6, anchorTime: '08:00' },
      duration: { startDate: today, endDate: addDays(today, 2) },
      inventoryCount: 4,
      refillThreshold: 6,
    },
    // A liquid, to show a non-pill form and a non-countable unit.
    {
      name: 'Vitamin D drops',
      form: 'drops',
      ink: 'yellow',
      dosageAmount: 5,
      dosageUnit: 'drop',
      instructionTags: ['morning', 'with-food'],
      schedule: { mode: 'once-daily', times: ['08:30'] },
      duration: { startDate: addDays(today, -20), endDate: null },
      inventoryCount: null,
      refillThreshold: 5,
    },
    // A finished course, so the Archive tab has something to show.
    {
      name: 'Prednisolone',
      strength: '5 mg tablet',
      form: 'round',
      ink: 'cream',
      dosageAmount: 2,
      dosageUnit: 'pill',
      instructionTags: ['after-food', 'morning'],
      schedule: { mode: 'once-daily', times: ['09:00'] },
      duration: { startDate: addDays(today, -14), endDate: addDays(today, -7) },
      inventoryCount: null,
      refillThreshold: 5,
    },
  ];
}

/**
 * Seeds demo medications and a fortnight of plausible logs.
 * Returns true if anything was written.
 */
export async function seedDemoDataIfEmpty(): Promise<boolean> {
  if (!SEED_DEMO_DATA) return false;

  const existing = await listMedications();
  if (existing.length > 0) return false;

  const today = toIsoDate();
  const created: Medication[] = [];

  for (const seed of buildSeeds(today)) {
    created.push(await insertMedication(seed));
  }

  // Backfill history so the adherence ring and heat grid have something to show.
  // Deliberately imperfect: a couple of skips and a gap, because a flat 100%
  // hides exactly the states worth reviewing.
  for (const medication of created) {
    const times = resolveDailyTimes(medication.schedule);

    for (let offset = -14; offset <= 0; offset += 1) {
      const date = addDays(today, offset);
      if (date < medication.duration.startDate) continue;
      if (medication.duration.endDate !== null && date > medication.duration.endDate) continue;

      for (const [index, time] of times.entries()) {
        // Leave today's later doses unlogged so the timeline has live rows to act on.
        if (offset === 0 && time >= '12:00') continue;

        // A deterministic sprinkle of skips — no Math.random, so the seeded
        // screenshot is identical run to run.
        const slot = Math.abs(offset) * times.length + index;
        const status =
          slot % 11 === 3 ? 'skipped'
          : slot % 17 === 5 ? 'missed'
          : 'taken';

        await upsertDoseLog({
          medicationId: medication.id,
          date,
          scheduledTime: time,
          status: status as DoseLog['status'],
        });
      }
    }
  }

  return true;
}
