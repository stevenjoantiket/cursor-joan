/**
 * src/features/dashboard/components/DoseCard.tsx
 *
 * One dose on the timeline. Two ways to act on it, always both available:
 *
 *   - Swipe right to take, left to skip — fast, once learned.
 *   - Tap to open the actions sheet — discoverable, and the only path that works
 *     with a screen reader or a motor impairment.
 *
 * The card leads with the <PillShape>, so the row is scannable by shape and
 * colour before any text is read.
 */
import React from 'react';
import { View } from 'react-native';
import {
  Badge,
  Card,
  Chip,
  Icon,
  PillShape,
  Row,
  SwipeableRow,
  Text,
  useTheme,
  medicineInk,
  type IconName,
} from '@ds';
import type { DoseOccurrence, DoseStatus } from '../../../domain/types';
import { instructionTagById } from '../../../domain/instructions';
import { formatClockTime } from '../../../utils/date';

const statusPresentation: Record<
  DoseStatus,
  { label: string; icon: IconName; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' }
> = {
  pending: { label: 'Due', icon: 'clock', tone: 'brand' },
  taken: { label: 'Taken', icon: 'checkCircle', tone: 'success' },
  skipped: { label: 'Skipped', icon: 'skipForward', tone: 'neutral' },
  snoozed: { label: 'Snoozed', icon: 'snooze', tone: 'warning' },
  missed: { label: 'Missed', icon: 'alert', tone: 'danger' },
};

export function DoseCard({
  dose,
  onPress,
  onTake,
  onSkip,
}: {
  dose: DoseOccurrence;
  onPress: () => void;
  onTake: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const { medication, status } = dose;
  const presentation = statusPresentation[status];
  const isResolved = status === 'taken' || status === 'skipped';
  const swatch = medicineInk[medication.ink] ?? medicineInk.white;

  const doseText = `${formatAmount(medication.dosageAmount)} ${medication.dosageUnit}`;
  const tags = medication.instructionTags
    .map((id) => instructionTagById(id))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
    .slice(0, 2);

  const card = (
    <Card
      onPress={onPress}
      padding="lg"
      elevated={isResolved ? 0 : 1}
      outlined={isResolved}
      tone={status === 'missed' ? 'danger' : 'default'}
      accentColor={status === 'pending' ? swatch.edge : undefined}
      accessibilityLabel={buildAccessibilityLabel(dose, doseText)}
      accessibilityHint="Opens dose actions"
      style={{ minHeight: theme.layout.doseRowMinHeight, justifyContent: 'center' }}
    >
      <Row gap="lg">
        <PillShape
          form={medication.form}
          ink={medication.ink}
          size={44}
          muted={isResolved}
        />

        <View style={{ ...theme.layout.fill, gap: theme.space.xs }}>
          <Row gap="sm">
            <Text
              variant="subheading"
              numberOfLines={1}
              style={theme.layout.fill}
              tone={isResolved ? 'secondary' : 'primary'}
            >
              {medication.name}
            </Text>
            <Badge label={presentation.label} icon={presentation.icon} tone={presentation.tone} />
          </Row>

          <Text variant="caption" tone="secondary">
            {doseText}
            {medication.strength ? ` · ${medication.strength}` : ''}
          </Text>

          {tags.length > 0 && !isResolved ? (
            <Row gap="xs" wrap style={{ marginTop: theme.space.xxs }}>
              {tags.map((tag) => (
                <Chip key={tag.id} label={tag.label} icon={tag.icon} size="sm" showSelectionMark={false} />
              ))}
            </Row>
          ) : null}
        </View>
      </Row>
    </Card>
  );

  // A resolved dose is not swipeable — there is nothing left to commit, and the
  // gesture would silently re-log the same outcome.
  if (isResolved) return card;

  return (
    <SwipeableRow
      left={{
        label: 'Taken',
        icon: 'check',
        color: theme.colors.success,
        onCommit: onTake,
      }}
      right={{
        label: 'Skip',
        icon: 'skipForward',
        color: theme.colors.textTertiary,
        onCommit: onSkip,
      }}
    >
      {card}
    </SwipeableRow>
  );
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

/** One sentence containing everything a screen reader needs from this row. */
function buildAccessibilityLabel(dose: DoseOccurrence, doseText: string): string {
  const time = formatClockTime(dose.scheduledTime);
  const status = statusPresentation[dose.status].label;
  return `${dose.medication.name}, ${doseText}, ${time}, ${status}`;
}
