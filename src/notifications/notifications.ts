/**
 * src/notifications/notifications.ts
 *
 * Background reminders via expo-notifications.
 *
 * The scheduling strategy, and why:
 *
 * A pill reminder must fire when the app is closed, after a reboot, and for
 * months on end. iOS caps an app at 64 pending local notifications, so
 * enumerating every dose of a 6-month course is not an option. Instead:
 *
 *   - A schedule whose times repeat daily (which, by design, is every schedule —
 *     see `resolveDailyTimes`) registers one DAILY repeating trigger per dose
 *     time. Four doses a day costs four notifications, not 720, and the OS keeps
 *     firing them without the app ever running.
 *   - A course with an end date additionally gets a one-shot "course finished"
 *     notification, and the daily triggers are cancelled by the archive sweep the
 *     first time the app opens after the course ends. Between the end date and
 *     that sweep, `shouldSuppressReminder` stops a stale reminder from being
 *     presented.
 *   - A snooze is a single one-shot trigger at the snooze time.
 *
 * Every identifier is written to `notification_registry` so a schedule edit can
 * cancel precisely the reminders it invalidates.
 *
 * Android also needs an explicit channel with a high importance for the reminder
 * to make a sound while the phone is idle; that is set up in `configure()`.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import type { ClockTime, Medication } from '../domain/types';
import { describeInstructions } from '../domain/instructions';
import { resolveDailyTimes } from '../domain/schedule';
import { combine, isWithin, minutesOfDay, toIsoDate } from '../utils/date';
import {
  forgetNotificationsForMedication,
  listNotificationsForMedication,
  pruneElapsedOneshots,
  recordNotifications,
  type NotificationRecord,
} from '../data/repositories/notificationRegistryRepo';

export const REMINDER_CHANNEL_ID = 'medication-reminders';

/** Payload carried on every reminder so a tap can deep-link to the right dose. */
export type ReminderPayload = {
  kind: 'dose-reminder' | 'course-finished' | 'refill-warning';
  medicationId: string;
  scheduledTime?: ClockTime;
};

/**
 * Foreground presentation. A medication reminder is shown even while the app is
 * open — the user may not be looking at the dashboard, and a silently swallowed
 * reminder is a missed dose.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** Creates the Android channel and returns the current permission state. */
export async function configure(): Promise<PermissionState> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Medication reminders',
        importance: Notifications.AndroidImportance.MAX,
        // A short double buzz: noticeable without being alarming.
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
        bypassDnd: false,
      });
    }

    const settings = await Notifications.getPermissionsAsync();
    return normalisePermission(settings);
  } catch {
    // Some targets (notably web) have no local-notification support at all.
    // Reminders being unavailable must never stop the app from opening — dose
    // tracking still works, and the UI surfaces the "reminders are off" notice.
    return 'undetermined';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  // A simulator cannot receive notifications; treat it as undetermined rather
  // than reporting a denial the user cannot fix.
  if (!Device.isDevice) return 'undetermined';

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return 'granted';

    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });
    return normalisePermission(requested);
  } catch {
    return 'undetermined';
  }
}

/** Permission read that reports 'undetermined' rather than throwing. */
async function safePermission(): Promise<PermissionState> {
  try {
    return normalisePermission(await Notifications.getPermissionsAsync());
  } catch {
    return 'undetermined';
  }
}

function normalisePermission(settings: Notifications.NotificationPermissionsStatus): PermissionState {
  if (settings.granted) return 'granted';
  if (settings.status === 'undetermined') return 'undetermined';
  return 'denied';
}

/**
 * Registers (or re-registers) every reminder for one medication.
 *
 * Idempotent: it cancels whatever was registered before, so calling it after any
 * edit leaves exactly one set of reminders in place.
 */
export async function syncMedicationReminders(medication: Medication): Promise<void> {
  await cancelMedicationReminders(medication.id);

  if (medication.status !== 'active') return;

  if ((await safePermission()) !== 'granted') return;

  const times = resolveDailyTimes(medication.schedule);
  const instructions = describeInstructions(medication.instructionTags);
  const records: NotificationRecord[] = [];

  for (const time of times) {
    const [hour, minute] = time.split(':').map(Number);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time for ${medication.name}`,
        body: buildReminderBody(medication, instructions),
        sound: 'default',
        badge: 1,
        data: {
          kind: 'dose-reminder',
          medicationId: medication.id,
          scheduledTime: time,
        } satisfies ReminderPayload,
        ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null),
        categoryIdentifier: DOSE_CATEGORY_ID,
      },
      // A repeating daily trigger: one per dose time, kept alive by the OS
      // without the app running. See the note at the top of this file.
      trigger: {
        hour: hour ?? 9,
        minute: minute ?? 0,
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null),
      },
    });

    records.push({
      identifier,
      medicationId: medication.id,
      scheduledTime: time,
      kind: 'daily',
      firesAt: null,
    });
  }

  // A one-shot nudge on the morning after the course ends, so the user notices
  // the medication has moved to the archive.
  const courseEndNotification = await scheduleCourseEndNotice(medication);
  if (courseEndNotification) records.push(courseEndNotification);

  await recordNotifications(records);
}

function buildReminderBody(medication: Medication, instructions: string): string {
  const dose = `${formatAmount(medication.dosageAmount)} ${medication.dosageUnit}`;
  return instructions ? `Take ${dose} · ${instructions}` : `Take ${dose}`;
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

async function scheduleCourseEndNotice(medication: Medication): Promise<NotificationRecord | null> {
  const { endDate } = medication.duration;
  if (endDate === null) return null;

  // 9am the day after the last dose.
  const firesAt = combine(endDate, '09:00').getTime() + 86_400_000;
  if (firesAt <= Date.now()) return null;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${medication.name} course finished`,
      body: 'Your prescription has moved to the Archive. Tap to review how you did.',
      data: { kind: 'course-finished', medicationId: medication.id } satisfies ReminderPayload,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null),
    },
    trigger: {
      date: new Date(firesAt),
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null),
    },
  });

  return {
    identifier,
    medicationId: medication.id,
    scheduledTime: '09:00',
    kind: 'oneshot',
    firesAt,
  };
}

/** One-shot reminder for a snoozed dose. */
export async function scheduleSnooze(
  medication: Medication,
  scheduledTime: ClockTime,
  firesAt: number,
): Promise<void> {
  if ((await safePermission()) !== 'granted') return;
  if (firesAt <= Date.now()) return;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${medication.name} — snoozed dose`,
      body: buildReminderBody(medication, describeInstructions(medication.instructionTags)),
      sound: 'default',
      data: {
        kind: 'dose-reminder',
        medicationId: medication.id,
        scheduledTime,
      } satisfies ReminderPayload,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null),
      categoryIdentifier: DOSE_CATEGORY_ID,
    },
    trigger: {
      date: new Date(firesAt),
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : null),
    },
  });

  await recordNotifications([
    { identifier, medicationId: medication.id, scheduledTime, kind: 'oneshot', firesAt },
  ]);
}

/** Cancels every pending reminder belonging to one medication. */
export async function cancelMedicationReminders(medicationId: string): Promise<void> {
  const records = await listNotificationsForMedication(medicationId);
  await Promise.all(
    records.map(async (record) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(record.identifier);
      } catch {
        // Already fired or already cancelled — the registry row still needs clearing.
      }
    }),
  );
  await forgetNotificationsForMedication(medicationId);
}

/**
 * Re-registers reminders for the whole library. Run on app start: the OS drops
 * pending local notifications when the app is reinstalled or its data is cleared,
 * and a device that changed timezone needs the daily triggers rebuilt.
 */
export async function syncAllReminders(medications: Medication[]): Promise<void> {
  await pruneElapsedOneshots();
  for (const medication of medications) {
    if (medication.status === 'active') {
      await syncMedicationReminders(medication);
    } else {
      await cancelMedicationReminders(medication.id);
    }
  }
}

/**
 * Whether a reminder that just arrived should be acted on.
 *
 * A daily trigger keeps firing until it is cancelled, and cancellation only
 * happens when the app next opens. This is the guard that stops a reminder for a
 * finished course from being treated as a live dose.
 */
export function shouldSuppressReminder(medication: Medication, now: Date = new Date()): boolean {
  if (medication.status !== 'active') return true;
  return !isWithin(toIsoDate(now), medication.duration.startDate, medication.duration.endDate);
}

export const DOSE_CATEGORY_ID = 'dose-actions';

/**
 * Registers "Taken" / "Snooze" buttons directly on the notification, so a dose
 * can be logged from the lock screen without opening the app.
 */
export async function registerDoseActions(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY_ID, [
      {
        identifier: 'MARK_TAKEN',
        buttonTitle: 'Taken',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'SNOOZE_15',
        buttonTitle: 'Snooze 15 min',
        options: { opensAppToForeground: false },
      },
    ]);
  } catch {
    // Notification categories are unsupported on some targets. Lock-screen
    // buttons are a nicety; losing them must not block startup.
  }
}

/** Sorts the next few pending triggers — surfaced in Settings for debugging. */
export async function describePendingReminders(): Promise<
  { medicationId: string; time: ClockTime; kind: string }[]
> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled
    .map((item) => {
      const data = item.content.data as ReminderPayload | undefined;
      return {
        medicationId: data?.medicationId ?? 'unknown',
        time: data?.scheduledTime ?? '--:--',
        kind: data?.kind ?? 'unknown',
      };
    })
    .sort((a, b) => minutesOfDay(a.time === '--:--' ? '00:00' : a.time) - minutesOfDay(b.time === '--:--' ? '00:00' : b.time));
}
