/**
 * Web sibling of medicationRepo. Same exported surface, backed by
 * webMemoryStore instead of SQLite. See webMemoryStore.ts for why.
 */
import { load, persist } from '../webMemoryStore';
import { createId } from '../../utils/id';
import type { Medication, MedicationStatus } from '../../domain/types';

export type NewMedicationInput = Omit<
  Medication,
  'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'status'
> & { status?: MedicationStatus };

export async function listMedications(): Promise<Medication[]> {
  return [...load().medications].sort(
    (a, b) =>
      a.status.localeCompare(b.status) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

export async function getMedication(id: string): Promise<Medication | null> {
  return load().medications.find((entry) => entry.id === id) ?? null;
}

export async function insertMedication(input: NewMedicationInput): Promise<Medication> {
  const now = Date.now();
  const medication: Medication = {
    ...input,
    id: createId('med'),
    status: input.status ?? 'active',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  load().medications.push(medication);
  persist();
  return medication;
}

export async function updateMedication(medication: Medication): Promise<Medication> {
  const next: Medication = { ...medication, updatedAt: Date.now() };
  const table = load().medications;
  const index = table.findIndex((entry) => entry.id === medication.id);
  if (index >= 0) table[index] = next;
  persist();
  return next;
}

export async function setInventoryCount(id: string, count: number | null): Promise<void> {
  const medication = load().medications.find((entry) => entry.id === id);
  if (!medication) return;
  medication.inventoryCount = count;
  medication.updatedAt = Date.now();
  persist();
}

export async function setMedicationStatus(id: string, status: MedicationStatus): Promise<void> {
  const medication = load().medications.find((entry) => entry.id === id);
  if (!medication) return;
  medication.status = status;
  medication.archivedAt = status === 'archived' ? Date.now() : null;
  medication.updatedAt = Date.now();
  persist();
}

export async function deleteMedication(id: string): Promise<void> {
  const store = load();
  // Mirrors the SQL schema's ON DELETE CASCADE.
  store.medications = store.medications.filter((entry) => entry.id !== id);
  store.doseLogs = store.doseLogs.filter((log) => log.medicationId !== id);
  store.notifications = store.notifications.filter((record) => record.medicationId !== id);
  persist();
}
