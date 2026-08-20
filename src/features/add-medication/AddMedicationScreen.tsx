/**
 * src/features/add-medication/AddMedicationScreen.tsx
 *
 * The add / edit flow.
 *
 * Four short steps rather than one long form: entering a medication is a
 * medium-stakes task done rarely, and a single scroll containing shape pickers, a
 * calendar and an inventory section reads as intimidating. Each step also gets its
 * own validation gate, so an error is raised next to the field that caused it.
 *
 * Progress is shown as a segmented bar. Back never loses data — the draft lives
 * above the steps for the whole flow.
 */
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, ProgressBar, Row, Screen, ScreenHeader, Text, useTheme } from '@ds';
import { useMedications } from '../../state/MedicationStore';
import type { Medication } from '../../domain/types';
import { hasCourseEnded } from '../../domain/archive';
import {
  ADD_STEPS,
  canAdvance,
  draftToMedicationInput,
  stepTitles,
  useMedicationDraft,
  type AddStep,
} from './useMedicationDraft';
import { IdentityStep } from './steps/IdentityStep';
import { DosageStep } from './steps/DosageStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { ReviewStep } from './steps/ReviewStep';

export function AddMedicationScreen({
  /** Passed when editing an existing record; omitted when creating one. */
  existing,
  onDone,
  onCancel,
}: {
  existing?: Medication;
  onDone: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const store = useMedications();
  const isEditing = Boolean(existing);

  const {
    draft,
    errors,
    update,
    setFrequencyMode,
    setTimes,
    setInterval,
    toggleInstructionTag,
    suggestThreshold,
    resolvedDuration,
    dailyTimes,
  } = useMedicationDraft(existing);

  const [stepIndex, setStepIndex] = useState(0);
  // Errors stay hidden until the user tries to move on, so a half-typed field is
  // never scolded mid-keystroke.
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const step: AddStep = ADD_STEPS[stepIndex] ?? 'identity';
  const isLastStep = stepIndex === ADD_STEPS.length - 1;

  const goToStep = (next: AddStep) => {
    setShowErrors(false);
    setStepIndex(ADD_STEPS.indexOf(next));
  };

  const handleNext = async () => {
    if (!canAdvance(step, errors)) {
      setShowErrors(true);
      return;
    }

    if (!isLastStep) {
      setShowErrors(false);
      setStepIndex((current) => current + 1);
      return;
    }

    await handleSave();
  };

  const handleSave = async () => {
    if (!canAdvance('review', errors)) {
      setShowErrors(true);
      return;
    }

    setSaving(true);
    try {
      const input = draftToMedicationInput(draft);

      if (existing) {
        // Keep identity and history; replace only what the form owns.
        //
        // Status is re-derived rather than carried over: extending the end date of
        // an archived course should bring it back, and shortening an active one to
        // a date already past should retire it. Comparing against *today* is what
        // makes both directions correct — comparing end against start (as an
        // earlier draft of this did) would revive a course that ended last month.
        const candidate: Medication = { ...existing, ...input };
        const ended = hasCourseEnded(candidate);

        await store.saveMedication({
          ...candidate,
          status: ended ? 'archived' : 'active',
          archivedAt: ended ? (existing.archivedAt ?? Date.now()) : null,
        });
      } else {
        await store.addMedication(input);
      }

      onDone();
    } catch (error) {
      Alert.alert(
        'Could not save',
        error instanceof Error ? error.message : 'Something went wrong saving this medication.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      onCancel();
      return;
    }
    setShowErrors(false);
    setStepIndex((current) => current - 1);
  };

  return (
    <Screen
      footer={
        <View style={{ gap: theme.space.sm }}>
          <Button
            label={isLastStep ? (isEditing ? 'Save changes' : 'Start taking this') : 'Continue'}
            iconRight={isLastStep ? 'check' : 'arrowRight'}
            fullWidth
            loading={saving}
            onPress={() => void handleNext()}
            testID="add-medication-primary"
          />
          <Button
            label={stepIndex === 0 ? 'Cancel' : 'Back'}
            variant="ghost"
            fullWidth
            onPress={handleBack}
          />
        </View>
      }
    >
      <View style={{ gap: theme.space.sm }}>
        <Row gap="xs">
          {ADD_STEPS.map((entry, index) => (
            <View key={entry} style={theme.layout.fill}>
              <ProgressBar
                progress={index <= stepIndex ? 1 : 0}
                height={4}
                accessibilityLabel={
                  index === stepIndex ? `Step ${index + 1} of ${ADD_STEPS.length}, current` : undefined
                }
              />
            </View>
          ))}
        </Row>
        <Text variant="caption" tone="tertiary">
          Step {stepIndex + 1} of {ADD_STEPS.length}
        </Text>
      </View>

      <ScreenHeader title={stepTitles[step].title} subtitle={stepTitles[step].subtitle} />

      {step === 'identity' ? (
        <IdentityStep draft={draft} errors={errors} showErrors={showErrors} update={update} />
      ) : null}

      {step === 'dosage' ? (
        <DosageStep
          draft={draft}
          errors={errors}
          showErrors={showErrors}
          update={update}
          toggleInstructionTag={toggleInstructionTag}
        />
      ) : null}

      {step === 'schedule' ? (
        <ScheduleStep
          draft={draft}
          errors={errors}
          showErrors={showErrors}
          dailyTimes={dailyTimes}
          resolvedDuration={resolvedDuration}
          update={update}
          setFrequencyMode={setFrequencyMode}
          setTimes={setTimes}
          setInterval={setInterval}
          suggestThreshold={suggestThreshold}
        />
      ) : null}

      {step === 'review' ? (
        <ReviewStep
          draft={draft}
          dailyTimes={dailyTimes}
          resolvedDuration={resolvedDuration}
          notificationsEnabled={store.state.permission === 'granted'}
          onEditStep={goToStep}
          onRequestNotifications={() => void store.requestNotificationPermission()}
        />
      ) : null}
    </Screen>
  );
}
