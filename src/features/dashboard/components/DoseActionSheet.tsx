/**
 * src/features/dashboard/components/DoseActionSheet.tsx
 *
 * The tap-path equivalent of the swipe gestures, plus the actions swiping cannot
 * express: snooze durations and undo. This is the accessible route to every dose
 * action — anything reachable by swipe must also be reachable here.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Chip,
  Divider,
  PillShape,
  Row,
  Section,
  Sheet,
  Text,
  useTheme,
} from '@ds';
import type { DoseOccurrence, DoseStatus } from '../../../domain/types';
import { instructionTagById } from '../../../domain/instructions';
import { formatClockTime, formatRelativeDay } from '../../../utils/date';

const SNOOZE_CHOICES = [10, 15, 30, 60];

export function DoseActionSheet({
  dose,
  visible,
  onClose,
  onLog,
  onUndo,
  onOpenMedication,
}: {
  dose: DoseOccurrence | null;
  visible: boolean;
  onClose: () => void;
  onLog: (status: Exclude<DoseStatus, 'pending'>, snoozeMinutes?: number) => void;
  onUndo: () => void;
  onOpenMedication: () => void;
}) {
  const theme = useTheme();
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  if (!dose) return null;

  const { medication } = dose;
  const alreadyLogged = dose.log !== null;
  const tags = medication.instructionTags
    .map((id) => instructionTagById(id))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

  const close = () => {
    setSnoozeOpen(false);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={medication.name}
      subtitle={`${formatRelativeDay(dose.date)} at ${formatClockTime(dose.scheduledTime)}`}
    >
      <Row gap="lg" align="center">
        <PillShape form={medication.form} ink={medication.ink} size={64} />
        <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
          <Text variant="heading">
            {formatAmount(medication.dosageAmount)} {medication.dosageUnit}
          </Text>
          {medication.strength ? (
            <Text variant="caption" tone="secondary">
              {medication.strength}
            </Text>
          ) : null}
        </View>
      </Row>

      {tags.length > 0 ? (
        <Row gap="xs" wrap>
          {tags.map((tag) => (
            <Chip key={tag.id} label={tag.label} icon={tag.icon} size="sm" showSelectionMark={false} />
          ))}
        </Row>
      ) : null}

      {medication.notes ? (
        <Text variant="body" tone="secondary">
          {medication.notes}
        </Text>
      ) : null}

      <Divider />

      {snoozeOpen ? (
        <Section title="Remind me again in">
          <Row gap="sm" wrap>
            {SNOOZE_CHOICES.map((minutes) => (
              <Chip
                key={minutes}
                label={minutes >= 60 ? `${minutes / 60} hour` : `${minutes} min`}
                icon="snooze"
                showSelectionMark={false}
                onPress={() => {
                  onLog('snoozed', minutes);
                  close();
                }}
              />
            ))}
          </Row>
          <Button label="Back" variant="ghost" onPress={() => setSnoozeOpen(false)} />
        </Section>
      ) : (
        <View style={{ gap: theme.space.sm }}>
          <Button
            label="Mark as taken"
            iconLeft="check"
            fullWidth
            onPress={() => {
              onLog('taken');
              close();
            }}
          />
          <Button
            label="Snooze"
            iconLeft="snooze"
            variant="secondary"
            fullWidth
            onPress={() => setSnoozeOpen(true)}
          />
          <Button
            label="Skip this dose"
            iconLeft="skipForward"
            variant="secondary"
            fullWidth
            onPress={() => {
              onLog('skipped');
              close();
            }}
          />
          {alreadyLogged ? (
            <Button
              label="Undo — set back to due"
              iconLeft="refresh"
              variant="ghost"
              fullWidth
              onPress={() => {
                onUndo();
                close();
              }}
            />
          ) : null}
          <Button
            label="View medication"
            iconRight="chevronRight"
            variant="ghost"
            fullWidth
            onPress={() => {
              close();
              onOpenMedication();
            }}
          />
        </View>
      )}
    </Sheet>
  );
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}
