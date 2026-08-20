/**
 * Web sibling of notificationRegistryRepo. Browsers cannot hold scheduled local
 * notifications, so this exists to keep the repository surface identical rather
 * than to do useful work.
 */
import { load, persist } from '../webMemoryStore';

export type NotificationRecord = {
  identifier: string;
  medicationId: string;
  scheduledTime: string;
  kind: 'daily' | 'oneshot';
  firesAt: number | null;
};

export async function listNotificationsForMedication(
  medicationId: string,
): Promise<NotificationRecord[]> {
  return load().notifications.filter((record) => record.medicationId === medicationId);
}

export async function listAllNotifications(): Promise<NotificationRecord[]> {
  return [...load().notifications];
}

export async function recordNotifications(records: NotificationRecord[]): Promise<void> {
  const store = load();
  for (const record of records) {
    const index = store.notifications.findIndex((entry) => entry.identifier === record.identifier);
    if (index >= 0) store.notifications[index] = record;
    else store.notifications.push(record);
  }
  persist();
}

export async function forgetNotificationsForMedication(medicationId: string): Promise<void> {
  const store = load();
  store.notifications = store.notifications.filter(
    (record) => record.medicationId !== medicationId,
  );
  persist();
}

export async function forgetNotification(identifier: string): Promise<void> {
  const store = load();
  store.notifications = store.notifications.filter(
    (record) => record.identifier !== identifier,
  );
  persist();
}

export async function pruneElapsedOneshots(now = Date.now()): Promise<void> {
  const store = load();
  store.notifications = store.notifications.filter(
    (record) => !(record.kind === 'oneshot' && record.firesAt !== null && record.firesAt < now),
  );
  persist();
}
