/**
 * App.tsx
 *
 * Provider order matters here:
 *   SafeAreaProvider  – insets, needed by <Screen> and <Sheet>
 *   ThemeProvider     – the design system; nothing below may render without it
 *   MedicationStore   – data, which reads no theme but is read by every screen
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@ds';
import { MedicationStoreProvider, useMedications } from '@app/state/MedicationStore';
import { RootNavigator } from '@app/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MedicationStoreProvider>
          <AppShell />
        </MedicationStoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Sits below both providers so it can hand the navigator the medication list —
 * the add/edit route needs it to resolve an id back into a record.
 */
function AppShell() {
  const theme = useTheme();
  const { state } = useMedications();

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <RootNavigator medications={state.medications} />
    </>
  );
}
