/**
 * Step 2 — dose amount, unit, and instruction tags.
 *
 * The unit toggle sits inside the amount field rather than beside it, so "2" and
 * "pills" read as one value. A stepper is offered alongside the keyboard for
 * countable units, which is how most people enter "1" or "2".
 */
import React from 'react';
import { View } from 'react-native';
import {
  Chip,
  Input,
  Row,
  Section,
  SegmentedControl,
  Stepper,
  Text,
  useTheme,
} from '@ds';
import { dosageUnits, type DosageUnit, type InstructionTagId } from '../../../domain/types';
import { instructionTags } from '../../../domain/instructions';
import type { FieldErrors, MedicationDraft } from '../useMedicationDraft';

/** Units where a stepper makes more sense than a keyboard. */
const COUNTABLE_UNITS: DosageUnit[] = ['pill', 'drop', 'puff', 'sachet', 'unit'];

export function DosageStep({
  draft,
  errors,
  showErrors,
  update,
  toggleInstructionTag,
}: {
  draft: MedicationDraft;
  errors: FieldErrors;
  showErrors: boolean;
  update: <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) => void;
  toggleInstructionTag: (id: InstructionTagId) => void;
}) {
  const theme = useTheme();
  const isCountable = COUNTABLE_UNITS.includes(draft.dosageUnit);
  const amount = Number(draft.dosageAmount) || 0;

  // Four at a time keeps every segment readable; the rest are chips below.
  const primaryUnits = dosageUnits.slice(0, 4);
  const secondaryUnits = dosageUnits.slice(4);

  return (
    <View style={{ gap: theme.space.xxl }}>
      <Section title="Dose" caption="How much do you take at one time?">
        {isCountable ? (
          <View style={{ gap: theme.space.md }}>
            <Stepper
              label="dose amount"
              value={amount}
              min={0.5}
              max={20}
              step={draft.dosageUnit === 'drop' ? 1 : 0.5}
              suffix={draft.dosageUnit === 'pill' && amount === 1 ? 'pill' : undefined}
              onChange={(next) => update('dosageAmount', String(next))}
            />
            {showErrors && errors.dosageAmount ? (
              <Text variant="caption" tone="danger">
                {errors.dosageAmount}
              </Text>
            ) : null}
          </View>
        ) : (
          <Input
            label={`Amount in ${draft.dosageUnit}`}
            required
            keyboardType="decimal-pad"
            value={draft.dosageAmount}
            onChangeText={(value) => update('dosageAmount', value.replace(/[^0-9.]/g, ''))}
            error={showErrors ? errors.dosageAmount : undefined}
            iconLeft="sliders"
          />
        )}
      </Section>

      <Section title="Unit">
        <View style={{ gap: theme.space.md }}>
          <SegmentedControl
            options={primaryUnits.map((unit) => ({ value: unit.value, label: unit.label }))}
            value={primaryUnits.some((unit) => unit.value === draft.dosageUnit) ? draft.dosageUnit : primaryUnits[0]!.value}
            onChange={(value) => update('dosageUnit', value)}
            accessibilityLabel="Dosage unit"
          />
          <Row gap="sm" wrap>
            {secondaryUnits.map((unit) => (
              <Chip
                key={unit.value}
                label={unit.label}
                selected={draft.dosageUnit === unit.value}
                size="sm"
                onPress={() => update('dosageUnit', unit.value)}
              />
            ))}
          </Row>
        </View>
      </Section>

      <Section title="Instructions" caption="Anything the label tells you to do. These appear on your reminders.">
        <Row gap="sm" wrap>
          {instructionTags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.label}
              icon={tag.icon}
              selected={draft.instructionTags.includes(tag.id)}
              onPress={() => toggleInstructionTag(tag.id)}
              testID={`tag-${tag.id}`}
            />
          ))}
        </Row>
      </Section>

      <Input
        label="Notes (optional)"
        placeholder="Anything else you want to remember"
        hint="Shown when you open a dose."
        value={draft.notes}
        onChangeText={(value) => update('notes', value)}
        multiline
        numberOfLines={3}
      />
    </View>
  );
}
