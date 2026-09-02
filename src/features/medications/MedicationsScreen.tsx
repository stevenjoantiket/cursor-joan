/**
 * src/features/medications/MedicationsScreen.tsx
 *
 * The library of active prescriptions — the "what am I on?" view, as distinct from
 * the dashboard's "what do I take now?".
 *
 * Cards here show the whole course rather than a single dose: the schedule, how
 * far through it the user is, and stock if tracked.
 */
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Badge,
  Button,
  Card,
  CardGrid,
  EmptyState,
  Icon,
  PillShape,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Text,
  useTheme,
} from '@ds';
import { useMedications } from '../../state/MedicationStore';
import type { Medication } from '../../domain/types';
import { describeSchedule, resolveDailyTimes } from '../../domain/schedule';
import { daysOfStockRemaining, stockLevel } from '../../domain/inventory';
import { courseProgress, describeCourseProgress } from '../../domain/archive';
import { formatClockTime } from '../../utils/date';

export function MedicationsScreen({
  onAddMedication,
  onOpenMedication,
}: {
  onAddMedication: () => void;
  onOpenMedication: (medicationId: string) => void;
}) {
  const { activeMedications } = useMedications();

  return (
    <Screen>
      <ScreenHeader
        title="Medications"
        subtitle={
          activeMedications.length === 0
            ? 'Your active prescriptions live here.'
            : `${activeMedications.length} active ${activeMedications.length === 1 ? 'prescription' : 'prescriptions'}`
        }
      />

      {activeMedications.length === 0 ? (
        <EmptyState
          icon="capsule"
          title="No active medications"
          message="Add a prescription to start building your daily schedule."
          actionLabel="Add a medication"
          onAction={onAddMedication}
        />
      ) : (
        <>
          <Section>
            {/* One column on a phone, two or three as the window widens — a
                library of eight prescriptions is a list to scan, and on a
                browser scanning it sideways beats scrolling it. */}
            <CardGrid>
              {activeMedications.map((medication) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  onPress={() => onOpenMedication(medication.id)}
                />
              ))}
            </CardGrid>
          </Section>
          <Button label="Add a medication" iconLeft="plus" variant="secondary" fullWidth onPress={onAddMedication} />
        </>
      )}
    </Screen>
  );
}

function MedicationCard({
  medication,
  onPress,
  style,
}: {
  medication: Medication;
  onPress: () => void;
  /** Forwarded to the Card so <CardGrid> can give a row equal-height cards. */
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const stock = stockLevel(medication);
  const stockDays = daysOfStockRemaining(medication);
  const times = resolveDailyTimes(medication.schedule);
  const hasEndDate = medication.duration.endDate !== null;

  return (
    <Card onPress={onPress} accessibilityHint="Opens this medication's full record" style={style}>
      <View style={{ gap: theme.space.md }}>
        <Row gap="lg">
          <PillShape form={medication.form} ink={medication.ink} size={48} />
          <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
            <Text variant="subheading" numberOfLines={1}>
              {medication.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {medication.dosageAmount} {medication.dosageUnit}
              {medication.strength ? ` · ${medication.strength}` : ''}
            </Text>
          </View>
          <Icon name="chevronRight" size={20} tone="tertiary" />
        </Row>

        <Text variant="caption" tone="secondary">
          {describeSchedule(medication.schedule)}
        </Text>

        <Row gap="xs" wrap>
          {times.slice(0, 4).map((time) => (
            <Badge key={time} label={formatClockTime(time)} icon="clock" />
          ))}
          {times.length > 4 ? <Badge label={`+${times.length - 4} more`} /> : null}
        </Row>

        {hasEndDate ? (
          <View style={{ gap: theme.space.xs }}>
            <ProgressBar
              progress={courseProgress(medication)}
              height={6}
              accessibilityLabel={`Course ${Math.round(courseProgress(medication) * 100)} percent complete`}
            />
            <Text variant="caption" tone="tertiary">
              {describeCourseProgress(medication)}
            </Text>
          </View>
        ) : (
          <Text variant="caption" tone="tertiary">
            {describeCourseProgress(medication)}
          </Text>
        )}

        {stock === 'low' || stock === 'empty' ? (
          <Row gap="sm">
            <Icon name="package" size={16} tone={stock === 'empty' ? 'danger' : 'warning'} />
            <Text variant="caption" tone={stock === 'empty' ? 'danger' : 'warning'}>
              {stock === 'empty'
                ? 'Out of stock — record a refill'
                : `${medication.inventoryCount} left${stockDays !== null ? ` · about ${stockDays} ${stockDays === 1 ? 'day' : 'days'}` : ''}`}
            </Text>
          </Row>
        ) : null}
      </View>
    </Card>
  );
}
