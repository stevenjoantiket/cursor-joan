/**
 * src/navigation/linking.ts
 *
 * URL <-> navigation-state mapping, and the browser tab's title.
 *
 * Why this matters for the web build: without it the address bar shows `/` on
 * every screen and the browser's Back button leaves the app instead of leaving the
 * screen — which is the single most jarring thing about a mobile app served in a
 * browser. With it, `/archive` is a link someone can bookmark, a medication has its
 * own address, and Back does what the platform promises.
 *
 * Deliberately web-only. Native already has notification taps for deep entry, and
 * turning URL handling on for iOS/Android would change behaviour that is working;
 * `enabled` keeps this change inside the browser build.
 */
import { Platform } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

export const linking: LinkingOptions<RootStackParamList> = {
  enabled: Platform.OS === 'web',
  // Unused on web (the browser's own origin is the prefix) but required by the
  // type, and correct for the scheme declared in app.json.
  prefixes: ['medcapsule://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          // Today is the index route, so it owns `/` rather than `/today`.
          Today: '',
          Medications: 'medications',
          Archive: 'archive',
        },
      },
      AddMedication: 'add',
      MedicationDetail: 'medication/:medicationId',
    },
  },
};

const SCREEN_TITLES: Record<string, string> = {
  Today: 'Today',
  Medications: 'Medications',
  Archive: 'Archive',
  AddMedication: 'Add a medication',
  MedicationDetail: 'Medication',
};

/**
 * The tab title tracks the screen, so browser history and a wall of open tabs stay
 * readable. The app name goes last: a truncated tab shows its first characters, and
 * "Archive" identifies the tab where "med+capsule…" does not.
 */
export const documentTitle = {
  formatter: (options: { title?: string } | undefined, route: { name: string } | undefined) => {
    const screen = options?.title ?? (route ? SCREEN_TITLES[route.name] : undefined);
    return screen ? `${screen} · med+capsule` : 'med+capsule';
  },
};
