/**
 * src/navigation/RootNavigator.tsx
 *
 * Three destinations (Today / Medications / Archive) with a modal stack over them
 * for the add-medication flow and the medication detail screen.
 *
 * The navigation chrome is drawn by <AppNavBar> from design-system tokens rather
 * than React Navigation's defaults, so it participates in the theme like every
 * other surface — and so it can change shape with the window: a bottom bar on a
 * phone, a leading rail in a browser. React Navigation still owns the routes and
 * the focus state; only the drawing is ours.
 */
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useBreakpoint, useTheme } from '@ds';
import { AppNavBar } from './AppNavBar';
import { documentTitle, linking } from './linking';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { MedicationsScreen } from '../features/medications/MedicationsScreen';
import { ArchiveScreen } from '../features/archive/ArchiveScreen';
import { AddMedicationScreen } from '../features/add-medication/AddMedicationScreen';
import { MedicationDetailScreen } from '../features/history/MedicationDetailScreen';
import type { Medication } from '../domain/types';

export type RootStackParamList = {
  Tabs: undefined;
  AddMedication: { medicationId?: string } | undefined;
  MedicationDetail: { medicationId: string };
};

export type TabParamList = {
  Today: undefined;
  Medications: undefined;
  Archive: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

function TabsNavigator() {
  const breakpoint = useBreakpoint();

  return (
    <Tabs.Navigator
      tabBar={(props) => <AppNavBar {...props} />}
      // The rail is absolutely positioned over the leading edge, so the scene has
      // to be inset by its width. At compact this is 0 and the bar sits in flow
      // below the scene, as a bottom tab bar should.
      sceneContainerStyle={{ paddingLeft: breakpoint.navRailWidth }}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="Today" options={{ tabBarAccessibilityLabel: "Today's schedule" }}>
        {({ navigation }) => (
          <DashboardScreen
            onAddMedication={() => navigation.getParent()?.navigate('AddMedication')}
            onOpenMedication={(medicationId) =>
              navigation.getParent()?.navigate('MedicationDetail', { medicationId })
            }
          />
        )}
      </Tabs.Screen>

      <Tabs.Screen name="Medications" options={{ tabBarAccessibilityLabel: 'Your medications' }}>
        {({ navigation }) => (
          <MedicationsScreen
            onAddMedication={() => navigation.getParent()?.navigate('AddMedication')}
            onOpenMedication={(medicationId) =>
              navigation.getParent()?.navigate('MedicationDetail', { medicationId })
            }
          />
        )}
      </Tabs.Screen>

      <Tabs.Screen name="Archive" options={{ tabBarAccessibilityLabel: 'Archived courses' }}>
        {({ navigation }) => (
          <ArchiveScreen
            onOpenMedication={(medicationId) =>
              navigation.getParent()?.navigate('MedicationDetail', { medicationId })
            }
          />
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

export function RootNavigator({ medications }: { medications: Medication[] }) {
  const theme = useTheme();

  // Hand React Navigation the design system's colours so its own chrome (screen
  // background during transitions, card shadows) matches the app.
  const navigationTheme = {
    ...(theme.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.isDark ? DarkTheme : DefaultTheme).colors,
      primary: theme.colors.brand,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme} linking={linking} documentTitle={documentTitle}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabsNavigator} />

        <Stack.Screen name="AddMedication" options={{ presentation: 'modal' }}>
          {({ navigation, route }) => {
            const medicationId = route.params?.medicationId;
            const existing = medicationId
              ? medications.find((entry) => entry.id === medicationId)
              : undefined;

            return (
              <AddMedicationScreen
                existing={existing}
                onDone={() => navigation.goBack()}
                onCancel={() => navigation.goBack()}
              />
            );
          }}
        </Stack.Screen>

        <Stack.Screen name="MedicationDetail">
          {({ navigation, route }) => (
            <MedicationDetailScreen
              medicationId={route.params.medicationId}
              onBack={() => navigation.goBack()}
              onEdit={(medication) =>
                navigation.navigate('AddMedication', { medicationId: medication.id })
              }
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
