/**
 * src/domain/inventory.ts
 *
 * Inventory tracking and the low-stock refill warning.
 *
 * Stock is decremented when a dose is logged as *taken* — never on a skip, and
 * never merely because a dose came due. That keeps the count honest: it reflects
 * what actually left the bottle.
 *
 * `unitsPerDose` matters: a "2 pills" dose consumes 2 units, while a dose
 * measured in mg or ml consumes 1 "unit" of the container per dose, because a
 * user counting a 30-tablet box is counting tablets, not milligrams.
 */
import type { Medication } from './types';
import { dosesPerDay } from './schedule';

export type StockLevel = 'untracked' | 'healthy' | 'low' | 'empty';

/**
 * The subset of a medication these calculations need. Accepting a Pick rather
 * than a full Medication lets the add-medication form project stock from an
 * in-progress draft, before anything has been saved.
 */
export type StockShape = Pick<
  Medication,
  'schedule' | 'dosageAmount' | 'dosageUnit' | 'inventoryCount'
>;

/** How many inventory units one dose consumes. */
export function unitsPerDose(medication: Pick<Medication, 'dosageAmount' | 'dosageUnit'>): number {
  const countable = medication.dosageUnit === 'pill'
    || medication.dosageUnit === 'drop'
    || medication.dosageUnit === 'puff'
    || medication.dosageUnit === 'sachet'
    || medication.dosageUnit === 'unit';

  if (!countable) return 1;
  // Guard against a zero or negative amount making stock immortal.
  return medication.dosageAmount > 0 ? medication.dosageAmount : 1;
}

export function stockLevel(medication: Pick<Medication, 'inventoryCount' | 'refillThreshold'>): StockLevel {
  if (medication.inventoryCount === null) return 'untracked';
  if (medication.inventoryCount <= 0) return 'empty';
  if (medication.inventoryCount <= medication.refillThreshold) return 'low';
  return 'healthy';
}

/** Whole days of stock remaining at the current schedule, or null if untracked. */
export function daysOfStockRemaining(medication: StockShape): number | null {
  if (medication.inventoryCount === null) return null;
  const perDay = dosesPerDay(medication.schedule) * unitsPerDose(medication);
  if (perDay <= 0) return null;
  return Math.floor(Math.max(0, medication.inventoryCount) / perDay);
}

/** The stock after taking one dose, floored at zero. Null stays null. */
export function decrementStock(medication: StockShape): number | null {
  if (medication.inventoryCount === null) return null;
  return Math.max(0, medication.inventoryCount - unitsPerDose(medication));
}

/** Undoing a "taken" log puts the units back. */
export function incrementStock(medication: StockShape): number | null {
  if (medication.inventoryCount === null) return null;
  return medication.inventoryCount + unitsPerDose(medication);
}

/** A default refill threshold: roughly three days of stock, clamped to a sane range. */
export function suggestRefillThreshold(
  medication: Pick<Medication, 'schedule' | 'dosageAmount' | 'dosageUnit'>,
): number {
  const perDay = dosesPerDay(medication.schedule) * unitsPerDose(medication);
  return Math.min(30, Math.max(3, Math.ceil(perDay * 3)));
}

export type RefillWarning = {
  medication: Medication;
  level: Exclude<StockLevel, 'untracked' | 'healthy'>;
  remaining: number;
  daysLeft: number | null;
  message: string;
};

/** Every medication that needs attention, most urgent first. */
export function refillWarnings(medications: Medication[]): RefillWarning[] {
  return medications
    .filter((medication) => medication.status === 'active')
    .flatMap<RefillWarning>((medication) => {
      const level = stockLevel(medication);
      if (level !== 'low' && level !== 'empty') return [];

      const remaining = medication.inventoryCount ?? 0;
      const daysLeft = daysOfStockRemaining(medication);
      const message = level === 'empty'
        ? `You've run out of ${medication.name}.`
        : daysLeft !== null && daysLeft > 0
          ? `${remaining} left — about ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} of doses.`
          : `Only ${remaining} left.`;

      return [{ medication, level, remaining, daysLeft, message }];
    })
    .sort((a, b) => a.remaining - b.remaining);
}
