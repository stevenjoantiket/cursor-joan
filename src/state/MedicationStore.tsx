/**
 * src/state/MedicationStore.tsx
 *
 * The app's single store. It owns the medication library, the logs for the day
 * being viewed, and the side effects that must accompany a write:
 *
 *   log a dose  -> write the log, adjust inventory, cancel/replace a snooze
 *   save a med   -> persist, then re-register its OS reminders
 *   app resumes  -> sweep finished courses into the archive, reconcile reminders
 *
 * Keeping those pairings in one place is deliberate: a dose logged without its
 * inventory decrement, or a schedule saved without its reminders rebuilt, is the
 * kind of bug that silently makes the app wrong.
 *
 * Context + useReducer is enough at this size — there is no server, no cache
 * invalidation, and a single writer.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { DoseLog, DoseOccurrence, DoseStatus, IsoDate, Medication } from '../domain/types';
import {
  buildDayTimeline,
  nextUpcomingDose,
  adherenceForMedication,
  adherenceOver,
} from '../domain/schedule';
import { decrementStock, incrementStock, refillWarnings } from '../domain/inventory';
import { medicationsDueForArchive, reactivationDuration } from '../domain/archive';
import { addDays, toIsoDate } from '../utils/date';
import { seedDemoDataIfEmpty } from '../data/devSeed';
import * as medicationRepo from '../data/repositories/medicationRepo';
import * as doseLogRepo from '../data/repositories/doseLogRepo';
import * as reminders from '../notifications/notifications';

type State = {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  medications: Medication[];
  /**
   * Logs for a rolling window ending at `selectedDate` — wide enough for the
   * timeline *and* the trailing adherence figures, narrow enough that it stays a
   * cheap query. Per-day views filter it by date; they never assume it is one day.
   */
  logs: DoseLog[];
  /** The day the dashboard is showing. Defaults to today. */
  selectedDate: IsoDate;
  permission: reminders.PermissionState;
  /** Bumped by a save so screens holding derived data recompute. */
  revision: number;
};

type Action =
  | { type: 'loading' }
  | { type: 'loaded'; medications: Medication[]; logs: DoseLog[]; permission: reminders.PermissionState }
  | { type: 'error'; message: string }
  | { type: 'setMedications'; medications: Medication[] }
  | { type: 'setLogs'; logs: DoseLog[] }
  | { type: 'setSelectedDate'; date: IsoDate }
  | { type: 'setPermission'; permission: reminders.PermissionState };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loading':
      return { ...state, status: 'loading', error: null };
    case 'loaded':
      return {
        ...state,
        status: 'ready',
        error: null,
        medications: action.medications,
        logs: action.logs,
        permission: action.permission,
        revision: state.revision + 1,
      };
    case 'error':
      return { ...state, status: 'error', error: action.message };
    case 'setMedications':
      return { ...state, medications: action.medications, revision: state.revision + 1 };
    case 'setLogs':
      return { ...state, logs: action.logs, revision: state.revision + 1 };
    case 'setSelectedDate':
      return { ...state, selectedDate: action.date };
    case 'setPermission':
      return { ...state, permission: action.permission };
    default:
      return state;
  }
}

const initialState: State = {
  status: 'loading',
  error: null,
  medications: [],
  logs: [],
  selectedDate: toIsoDate(),
  permission: 'undetermined',
  revision: 0,
};

/**
 * How many days of logs to keep in memory. Covers the 7-day adherence strip and
 * a month of history scrubbing without a second query.
 */
const LOG_WINDOW_DAYS = 30;

export type LogDoseOptions = {
  /** Minutes to snooze by. Required when status is 'snoozed'. */
  snoozeMinutes?: number;
};

type StoreValue = {
  state: State;
  /** Today's (or the selected day's) timeline, sorted by time. */
  timeline: DoseOccurrence[];
  upNext: DoseOccurrence | null;
  activeMedications: Medication[];
  archivedMedications: Medication[];
  warnings: ReturnType<typeof refillWarnings>;
  /** Adherence across all medications for the last 7 days. */
  weeklyAdherence: ReturnType<typeof adherenceOver>;

  selectDate: (date: IsoDate) => void;
  refresh: () => Promise<void>;

  addMedication: (input: medicationRepo.NewMedicationInput) => Promise<Medication>;
  saveMedication: (medication: Medication) => Promise<void>;
  archiveMedication: (id: string) => Promise<void>;
  reactivateMedication: (id: string, endDate?: IsoDate | null) => Promise<void>;
  removeMedication: (id: string) => Promise<void>;
  recordRefill: (id: string, unitsAdded: number) => Promise<void>;

  logDose: (dose: DoseOccurrence, status: Exclude<DoseStatus, 'pending'>, options?: LogDoseOptions) => Promise<void>;
  undoDose: (dose: DoseOccurrence) => Promise<void>;

  requestNotificationPermission: () => Promise<void>;
  adherenceFor: (medication: Medication, logs: DoseLog[]) => ReturnType<typeof adherenceForMedication>;
  logsForMedication: (medicationId: string) => Promise<DoseLog[]>;
};

const StoreContext = createContext<StoreValue | null>(null);

export function MedicationStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Guards the archive sweep so a rapid background/foreground cycle cannot run
  // two sweeps concurrently and double-write.
  const sweeping = useRef(false);
  // Read inside callbacks that must not be re-created on every date change.
  const selectedDateRef = useRef(state.selectedDate);
  selectedDateRef.current = state.selectedDate;

  const loadAll = useCallback(async (date: IsoDate) => {
    const [medications, logs] = await Promise.all([
      medicationRepo.listMedications(),
      doseLogRepo.listLogsBetween(addDays(date, -(LOG_WINDOW_DAYS - 1)), date),
    ]);
    return { medications, logs };
  }, []);

  /** Moves finished courses to the archive and cancels their reminders. */
  const runArchiveSweep = useCallback(async (medications: Medication[]): Promise<boolean> => {
    if (sweeping.current) return false;
    const due = medicationsDueForArchive(medications);
    if (due.length === 0) return false;

    sweeping.current = true;
    try {
      for (const medication of due) {
        await medicationRepo.setMedicationStatus(medication.id, 'archived');
        await reminders.cancelMedicationReminders(medication.id);
      }
      return true;
    } finally {
      sweeping.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const permission = await reminders.configure();
      let { medications, logs } = await loadAll(state.selectedDate);

      const archivedAny = await runArchiveSweep(medications);
      if (archivedAny) {
        medications = await medicationRepo.listMedications();
      }

      dispatch({ type: 'loaded', medications, logs, permission });
    } catch (error) {
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not open your records.',
      });
    }
  }, [loadAll, runArchiveSweep, state.selectedDate]);

  // Initial load. Reminders are reconciled once afterwards, because the OS drops
  // pending local notifications on reinstall and after a timezone change.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const permission = await reminders.configure();
        await reminders.registerDoseActions();

        // Dev only, and only when there is nothing to lose — see devSeed.ts.
        if (__DEV__) await seedDemoDataIfEmpty();

        let { medications, logs } = await loadAll(initialState.selectedDate);
        const archivedAny = await runArchiveSweep(medications);
        if (archivedAny) medications = await medicationRepo.listMedications();

        if (cancelled) return;
        dispatch({ type: 'loaded', medications, logs, permission });

        if (permission === 'granted') {
          await reminders.syncAllReminders(medications);
        }
      } catch (error) {
        if (cancelled) return;
        dispatch({
          type: 'error',
          message: error instanceof Error ? error.message : 'Could not open your records.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAll, runArchiveSweep]);

  // Re-sweep and reload whenever the app comes back to the foreground: the day
  // may have rolled over, or a course may have ended, while it was closed.
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') void refresh();
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [refresh]);

  // Reload logs when the viewed day changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const logs = await doseLogRepo.listLogsBetween(
        addDays(state.selectedDate, -(LOG_WINDOW_DAYS - 1)),
        state.selectedDate,
      );
      if (!cancelled) dispatch({ type: 'setLogs', logs });
    })();
    return () => {
      cancelled = true;
    };
  }, [state.selectedDate]);

  /**
   * Reloads the log window. `anchor` is the day that was just written to; the
   * window still ends at the day being viewed, so logging a dose on a past day
   * cannot silently scroll the dashboard's range.
   */
  const reloadLogs = useCallback(async (anchor: IsoDate) => {
    const end = anchor > selectedDateRef.current ? anchor : selectedDateRef.current;
    const logs = await doseLogRepo.listLogsBetween(
      addDays(end, -(LOG_WINDOW_DAYS - 1)),
      end,
    );
    dispatch({ type: 'setLogs', logs });
  }, []);

  const reloadMedications = useCallback(async () => {
    const medications = await medicationRepo.listMedications();
    dispatch({ type: 'setMedications', medications });
  }, []);

  const addMedication = useCallback<StoreValue['addMedication']>(
    async (input) => {
      const created = await medicationRepo.insertMedication(input);
      await reminders.syncMedicationReminders(created);
      await reloadMedications();
      return created;
    },
    [reloadMedications],
  );

  const saveMedication = useCallback<StoreValue['saveMedication']>(
    async (medication) => {
      const saved = await medicationRepo.updateMedication(medication);
      // Any edit may have changed the times, so rebuild this medication's reminders.
      await reminders.syncMedicationReminders(saved);
      await reloadMedications();
    },
    [reloadMedications],
  );

  const archiveMedication = useCallback<StoreValue['archiveMedication']>(
    async (id) => {
      await medicationRepo.setMedicationStatus(id, 'archived');
      await reminders.cancelMedicationReminders(id);
      await reloadMedications();
    },
    [reloadMedications],
  );

  const reactivateMedication = useCallback<StoreValue['reactivateMedication']>(
    async (id, endDate) => {
      const medication = await medicationRepo.getMedication(id);
      if (!medication) return;

      // A repeat prescription starts today; reusing the old dates would create a
      // course whose every dose is already in the past.
      const duration =
        endDate === undefined
          ? reactivationDuration(medication)
          : { startDate: toIsoDate(), endDate };

      const revived: Medication = {
        ...medication,
        status: 'active',
        archivedAt: null,
        duration,
      };

      await medicationRepo.updateMedication(revived);
      await reminders.syncMedicationReminders(revived);
      await reloadMedications();
    },
    [reloadMedications],
  );

  const removeMedication = useCallback<StoreValue['removeMedication']>(
    async (id) => {
      await reminders.cancelMedicationReminders(id);
      await medicationRepo.deleteMedication(id);
      await reloadMedications();
      await reloadLogs(selectedDateRef.current);
    },
    [reloadMedications, reloadLogs],
  );

  const recordRefill = useCallback<StoreValue['recordRefill']>(
    async (id, unitsAdded) => {
      const medication = await medicationRepo.getMedication(id);
      if (!medication) return;
      const current = medication.inventoryCount ?? 0;
      await medicationRepo.setInventoryCount(id, Math.max(0, current + unitsAdded));
      await reloadMedications();
    },
    [reloadMedications],
  );

  const logDose = useCallback<StoreValue['logDose']>(
    async (dose, status, options) => {
      const previousStatus = dose.log?.status ?? null;
      const snoozedUntil =
        status === 'snoozed'
          ? Date.now() + (options?.snoozeMinutes ?? 15) * 60_000
          : null;

      await doseLogRepo.upsertDoseLog({
        medicationId: dose.medication.id,
        date: dose.date,
        scheduledTime: dose.scheduledTime,
        status,
        snoozedUntil,
      });

      // Inventory follows what actually left the bottle, so it only moves on the
      // transition into or out of 'taken'.
      if (status === 'taken' && previousStatus !== 'taken') {
        await medicationRepo.setInventoryCount(
          dose.medication.id,
          decrementStock(dose.medication),
        );
      } else if (previousStatus === 'taken' && status !== 'taken') {
        await medicationRepo.setInventoryCount(
          dose.medication.id,
          incrementStock(dose.medication),
        );
      }

      if (status === 'snoozed' && snoozedUntil) {
        await reminders.scheduleSnooze(dose.medication, dose.scheduledTime, snoozedUntil);
      }

      await reloadLogs(dose.date);
      // The inventory change has to reach the UI for the low-stock warning to appear.
      await reloadMedications();
    },
    [reloadLogs, reloadMedications],
  );

  const undoDose = useCallback<StoreValue['undoDose']>(
    async (dose) => {
      if (dose.log?.status === 'taken') {
        await medicationRepo.setInventoryCount(
          dose.medication.id,
          incrementStock(dose.medication),
        );
      }
      await doseLogRepo.deleteDoseLog(dose.medication.id, dose.date, dose.scheduledTime);
      await reloadLogs(dose.date);
      await reloadMedications();
    },
    [reloadLogs, reloadMedications],
  );

  const requestNotificationPermission = useCallback(async () => {
    const permission = await reminders.requestPermission();
    dispatch({ type: 'setPermission', permission });
    if (permission === 'granted') {
      const medications = await medicationRepo.listMedications();
      await reminders.syncAllReminders(medications);
    }
  }, []);

  // Lock-screen action buttons ("Taken" / "Snooze 15 min") land here.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as
        | reminders.ReminderPayload
        | undefined;
      if (!data?.medicationId || !data.scheduledTime) return;

      const medication = await medicationRepo.getMedication(data.medicationId);
      if (!medication) return;
      // A daily trigger keeps firing after a course ends; ignore those.
      if (reminders.shouldSuppressReminder(medication)) return;

      const today = toIsoDate();
      const action = response.actionIdentifier;

      if (action === 'MARK_TAKEN') {
        await doseLogRepo.upsertDoseLog({
          medicationId: medication.id,
          date: today,
          scheduledTime: data.scheduledTime,
          status: 'taken',
        });
        await medicationRepo.setInventoryCount(medication.id, decrementStock(medication));
      } else if (action === 'SNOOZE_15') {
        const firesAt = Date.now() + 15 * 60_000;
        await doseLogRepo.upsertDoseLog({
          medicationId: medication.id,
          date: today,
          scheduledTime: data.scheduledTime,
          status: 'snoozed',
          snoozedUntil: firesAt,
        });
        await reminders.scheduleSnooze(medication, data.scheduledTime, firesAt);
      }

      await reloadLogs(today);
      await reloadMedications();
    });

    return () => subscription.remove();
  }, [reloadLogs, reloadMedications]);

  const value = useMemo<StoreValue>(() => {
    const now = new Date();
    const timeline = buildDayTimeline(state.medications, state.selectedDate, state.logs, now);
    const activeMedications = state.medications.filter((m) => m.status === 'active');
    const archivedMedications = state.medications.filter((m) => m.status === 'archived');

    return {
      state,
      timeline,
      upNext: nextUpcomingDose(timeline, now),
      activeMedications,
      archivedMedications,
      warnings: refillWarnings(state.medications),
      weeklyAdherence: adherenceOver(
        state.medications,
        state.logs,
        addDays(state.selectedDate, -6),
        state.selectedDate,
        now,
      ),

      selectDate: (date) => dispatch({ type: 'setSelectedDate', date }),
      refresh,
      addMedication,
      saveMedication,
      archiveMedication,
      reactivateMedication,
      removeMedication,
      recordRefill,
      logDose,
      undoDose,
      requestNotificationPermission,
      adherenceFor: (medication, logs) => adherenceForMedication(medication, logs, new Date()),
      logsForMedication: (medicationId) => doseLogRepo.listLogsForMedication(medicationId),
    };
  }, [
    state,
    refresh,
    addMedication,
    saveMedication,
    archiveMedication,
    reactivateMedication,
    removeMedication,
    recordRefill,
    logDose,
    undoDose,
    requestNotificationPermission,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useMedications(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useMedications() must be called inside <MedicationStoreProvider>.');
  }
  return context;
}
