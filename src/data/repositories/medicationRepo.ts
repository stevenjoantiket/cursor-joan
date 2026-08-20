/**
 * src/data/repositories/medicationRepo.ts
 *
 * Row <-> domain mapping for medications. The rest of the app never sees a
 * snake_case column or a JSON-encoded array; that translation stops here.
 */
import type * as SQLite from 'expo-sqlite';
import { getDatabase } from '../db';
import { createId } from '../../utils/id';
import type {
  DosageUnit,
  InstructionTagId,
  Medication,
  MedicationStatus,
  MedicineForm,
  MedicineInkName,
  Schedule,
} from '../../domain/types';

type MedicationRow = {
  id: string;
  name: string;
  strength: string | null;
  form: string;
  ink: string;
  dosage_amount: number;
  dosage_unit: string;
  instruction_tags: string;
  schedule_mode: string;
  schedule_times: string;
  interval_hours: number | null;
  anchor_time: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  inventory_count: number | null;
  refill_threshold: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
  archived_at: number | null;
};

/** Tolerant JSON parse — a corrupt cell degrades to an empty list, not a crash. */
function parseJsonArray<T>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function rowToMedication(row: MedicationRow): Medication {
  const schedule: Schedule = {
    mode: row.schedule_mode as Schedule['mode'],
    times: parseJsonArray<string>(row.schedule_times),
    intervalHours: row.interval_hours ?? undefined,
    anchorTime: row.anchor_time ?? undefined,
  };

  return {
    id: row.id,
    name: row.name,
    strength: row.strength ?? undefined,
    form: row.form as MedicineForm,
    ink: row.ink as MedicineInkName,
    dosageAmount: row.dosage_amount,
    dosageUnit: row.dosage_unit as DosageUnit,
    instructionTags: parseJsonArray<InstructionTagId>(row.instruction_tags),
    schedule,
    duration: { startDate: row.start_date, endDate: row.end_date },
    status: row.status as MedicationStatus,
    inventoryCount: row.inventory_count,
    refillThreshold: row.refill_threshold,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export type NewMedicationInput = Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'status'> & {
  status?: MedicationStatus;
};

export async function listMedications(): Promise<Medication[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MedicationRow>(
    `SELECT * FROM medications ORDER BY status ASC, name COLLATE NOCASE ASC;`,
  );
  return rows.map(rowToMedication);
}

export async function getMedication(id: string): Promise<Medication | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MedicationRow>(`SELECT * FROM medications WHERE id = ?;`, [id]);
  return row ? rowToMedication(row) : null;
}

export async function insertMedication(input: NewMedicationInput): Promise<Medication> {
  const db = await getDatabase();
  const now = Date.now();

  const medication: Medication = {
    ...input,
    id: createId('med'),
    status: input.status ?? 'active',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };

  await db.runAsync(
    `INSERT INTO medications (
       id, name, strength, form, ink, dosage_amount, dosage_unit, instruction_tags,
       schedule_mode, schedule_times, interval_hours, anchor_time,
       start_date, end_date, status, inventory_count, refill_threshold, notes,
       created_at, updated_at, archived_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    medicationToParams(medication),
  );

  return medication;
}

export async function updateMedication(medication: Medication): Promise<Medication> {
  const db = await getDatabase();
  const next: Medication = { ...medication, updatedAt: Date.now() };

  await db.runAsync(
    `UPDATE medications SET
       name = ?, strength = ?, form = ?, ink = ?, dosage_amount = ?, dosage_unit = ?,
       instruction_tags = ?, schedule_mode = ?, schedule_times = ?, interval_hours = ?,
       anchor_time = ?, start_date = ?, end_date = ?, status = ?, inventory_count = ?,
       refill_threshold = ?, notes = ?, updated_at = ?, archived_at = ?
     WHERE id = ?;`,
    [
      next.name,
      next.strength ?? null,
      next.form,
      next.ink,
      next.dosageAmount,
      next.dosageUnit,
      JSON.stringify(next.instructionTags),
      next.schedule.mode,
      JSON.stringify(next.schedule.times),
      next.schedule.intervalHours ?? null,
      next.schedule.anchorTime ?? null,
      next.duration.startDate,
      next.duration.endDate,
      next.status,
      next.inventoryCount,
      next.refillThreshold,
      next.notes ?? null,
      next.updatedAt,
      next.archivedAt,
      next.id,
    ],
  );

  return next;
}

/** Sets inventory directly — used when a dose is taken or a refill is recorded. */
export async function setInventoryCount(id: string, count: number | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE medications SET inventory_count = ?, updated_at = ? WHERE id = ?;`, [
    count,
    Date.now(),
    id,
  ]);
}

export async function setMedicationStatus(
  id: string,
  status: MedicationStatus,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE medications SET status = ?, archived_at = ?, updated_at = ? WHERE id = ?;`, [
    status,
    status === 'archived' ? Date.now() : null,
    Date.now(),
    id,
  ]);
}

/** Deletes the medication; dose logs cascade away with it. */
export async function deleteMedication(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM medications WHERE id = ?;`, [id]);
}

function medicationToParams(medication: Medication): SQLite.SQLiteBindValue[] {
  return [
    medication.id,
    medication.name,
    medication.strength ?? null,
    medication.form,
    medication.ink,
    medication.dosageAmount,
    medication.dosageUnit,
    JSON.stringify(medication.instructionTags),
    medication.schedule.mode,
    JSON.stringify(medication.schedule.times),
    medication.schedule.intervalHours ?? null,
    medication.schedule.anchorTime ?? null,
    medication.duration.startDate,
    medication.duration.endDate,
    medication.status,
    medication.inventoryCount,
    medication.refillThreshold,
    medication.notes ?? null,
    medication.createdAt,
    medication.updatedAt,
    medication.archivedAt,
  ];
}
