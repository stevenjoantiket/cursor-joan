/**
 * src/features/history/MedicationDetailScreen.tsx
 *
 * One medication's full record: what it is, when it is taken, how well it has been
 * adhered to, and every dose logged so far.
 *
 * The adherence heat grid uses the design system's <CalendarMonth> with per-day
 * fills, so a month of behaviour is legible in one glance — a pattern of missed
 * weekends shows up as a shape, not a number.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import {
  Badge,
  Button,
  CalendarMonth,
  Card,
  Chip,
  Divider,
  Icon,
  InlineNotice,
  ListRow,
  PillShape,
  ProgressBar,
  ProgressRing,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Sheet,
  Stepper,
  Text,
  useTheme,
  type DayState,
} from '@ds';
import { useMedications } from '../../state/MedicationStore';
import type { DoseLog, IsoDate, Medication } from '../../domain/types';
import {
  adherenceForMedication,
  describeSchedule,
  occurrencesFor,
  resolveDailyTimes,
} from '../../domain/schedule';
import { instructionTagById } from '../../domain/instructions';
import { daysOfStockRemaining, stockLevel } from '../../domain/inventory';
import { courseProgress, describeCourseProgress } from '../../domain/archive';
import {
  formatClockTime,
  formatLongDate,
  formatRelativeDay,
  fromIsoDate,
  isWithin,
  toIsoDate,
} from '../../utils/date';

export function MedicationDetailScreen({
  medicationId,
  onBack,
  onEdit,
}: {
  medicationId: string;
  onBack: () => void;
  onEdit: (medication: Medication) => void;
}) {
  const theme = useTheme();
  const store = useMedications();

  const medication = store.state.medications.find((entry) => entry.id === medicationId);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [refillOpen, setRefillOpen] = useState(false);
  const [refillAmount, setRefillAmount] = useState(30);

  const today = toIsoDate();
  const initialMonth = medication ? fromIsoDate(today) : new Date();
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());

  // The medication's own logs, not the store's rolling window: a course may be
  // months long and the whole record is what this screen is for.
  useEffect(() => {
    let cancelled = false;
    void store.logsForMedication(medicationId).then((result) => {
      if (!cancelled) setLogs(result);
    });
    return () => {
      cancelled = true;
    };
  }, [medicationId, store, store.state.revision]);

  const adherence = useMemo(
    () => (medication ? adherenceForMedication(medication, logs) : null),
    [medication, logs],
  );

  /**
   * Per-day outcome for the heat grid. A day is green when every dose was taken,
   * amber when some were, red when none were and the day has passed.
   */
  const dayStateFor = (isoDate: IsoDate): DayState => {
    if (!medication) return {};

    const withinCourse = isWithin(isoDate, medication.duration.startDate, medication.duration.endDate);
    if (!withinCourse) {
      return { textColor: theme.colors.textTertiary, disabled: true, accessibilityLabel: `${formatLongDate(isoDate)}, not scheduled` };
    }

    // Treat the course as active for derivation so archived days still resolve.
    const doses = occurrencesFor({ ...medication, status: 'active' }, isoDate, logs);
    if (doses.length === 0) return {};

    const taken = doses.filter((dose) => dose.status === 'taken').length;
    const unresolved = doses.filter((dose) => dose.status === 'pending' || dose.status === 'snoozed').length;

    if (unresolved === doses.length) {
      return {
        fill: theme.colors.surfaceMuted,
        accessibilityLabel: `${formatLongDate(isoDate)}, ${doses.length} doses scheduled`,
      };
    }

    const ratio = taken / doses.length;
    const fill =
      ratio === 1 ? theme.colors.success
      : ratio > 0 ? theme.colors.warning
      : theme.colors.danger;

    return {
      fill,
      textColor: theme.colors.textInverse,
      accessibilityLabel: `${formatLongDate(isoDate)}, ${taken} of ${doses.length} doses taken`,
    };
  };

  if (!medication) {
    return (
      <Screen>
        <ScreenHeader title="Medication" onBack={onBack} />
        <InlineNotice
          tone="warning"
          title="This medication is no longer here"
          message="It may have been deleted from another screen."
          actionLabel="Go back"
          onAction={onBack}
        />
      </Screen>
    );
  }

  const tags = medication.instructionTags
    .map((id) => instructionTagById(id))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

  const stock = stockLevel(medication);
  const stockDays = daysOfStockRemaining(medication);
  const isArchived = medication.status === 'archived';

  const recentLogs = [...logs]
    .sort((a, b) => (b.date + b.scheduledTime).localeCompare(a.date + a.scheduledTime))
    .slice(0, 12);

  const confirmArchive = () => {
    Alert.alert(
      `Archive ${medication.name}?`,
      'Reminders stop and it moves to your Archive. Your history is kept, and you can reactivate it any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => void store.archiveMedication(medication.id),
        },
      ],
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      `Delete ${medication.name}?`,
      'This removes the medication and its entire dose history. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await store.removeMedication(medication.id);
            onBack();
          },
        },
      ],
    );
  };

  return (
    <>
      <Screen>
        <ScreenHeader
          title={medication.name}
          subtitle={medication.strength}
          onBack={onBack}
          action={<Chip label="Edit" icon="edit" size="sm" showSelectionMark={false} onPress={() => onEdit(medication)} />}
        />

        <Card>
          <Row gap="lg">
            <PillShape form={medication.form} ink={medication.ink} size={72} muted={isArchived} />
            <View style={{ ...theme.layout.fill, gap: theme.space.xs }}>
              <Text variant="heading">
                {medication.dosageAmount} {medication.dosageUnit}
              </Text>
              <Text variant="caption" tone="secondary">
                {describeSchedule(medication.schedule)}
              </Text>
              <Row gap="xs" wrap style={{ marginTop: theme.space.xxs }}>
                <Badge
                  label={isArchived ? 'Archived' : 'Active'}
                  icon={isArchived ? 'archive' : 'checkCircle'}
                  tone={isArchived ? 'neutral' : 'success'}
                />
                <Badge label={describeCourseProgress(medication)} icon="calendar" />
              </Row>
            </View>
          </Row>

          {tags.length > 0 ? (
            <Row gap="xs" wrap style={{ marginTop: theme.space.lg }}>
              {tags.map((tag) => (
                <Chip key={tag.id} label={tag.label} icon={tag.icon} size="sm" showSelectionMark={false} />
              ))}
            </Row>
          ) : null}

          {medication.notes ? (
            <Text variant="body" tone="secondary" style={{ marginTop: theme.space.lg }}>
              {medication.notes}
            </Text>
          ) : null}
        </Card>

        {isArchived ? (
          <Button
            label="Reactivate this prescription"
            iconLeft="refresh"
            fullWidth
            onPress={() => void store.reactivateMedication(medication.id)}
          />
        ) : null}

        {adherence ? (
          <Section title="Adherence">
            <Card outlined elevated={0}>
              <Row gap="lg">
                <ProgressRing
                  progress={adherence.rate}
                  size={84}
                  thickness={9}
                  color={adherence.rate >= 0.8 ? theme.colors.success : theme.colors.warning}
                  label={`${Math.round(adherence.rate * 100)}%`}
                  caption="on time"
                  accessibilityLabel={`Adherence ${Math.round(adherence.rate * 100)} percent`}
                />
                <View style={{ ...theme.layout.fill, gap: theme.space.sm }}>
                  <ListRow
                    leading={<Icon name="check" size={18} tone="success" />}
                    title={`${adherence.taken} taken`}
                    subtitle={`out of ${adherence.taken + adherence.skipped + adherence.missed} due so far`}
                  />
                  {adherence.skipped > 0 ? (
                    <ListRow
                      leading={<Icon name="skipForward" size={18} tone="secondary" />}
                      title={`${adherence.skipped} skipped`}
                    />
                  ) : null}
                  {adherence.missed > 0 ? (
                    <ListRow
                      leading={<Icon name="alert" size={18} tone="danger" />}
                      title={`${adherence.missed} missed`}
                    />
                  ) : null}
                </View>
              </Row>
            </Card>
          </Section>
        ) : null}

        <Section title="Course" caption="Green means every dose that day was taken.">
          <Card outlined elevated={0}>
            <View style={{ gap: theme.space.lg }}>
              <CalendarMonth
                year={viewYear}
                monthIndex={viewMonth}
                onChangeMonth={(delta) => {
                  const next = new Date(viewYear, viewMonth + delta, 1);
                  setViewYear(next.getFullYear());
                  setViewMonth(next.getMonth());
                }}
                getDayState={dayStateFor}
                compact
              />
              {medication.duration.endDate !== null ? (
                <View style={{ gap: theme.space.xs }}>
                  <ProgressBar
                    progress={courseProgress(medication)}
                    accessibilityLabel={`Course ${Math.round(courseProgress(medication) * 100)} percent complete`}
                  />
                  <Text variant="caption" tone="tertiary">
                    {formatLongDate(medication.duration.startDate)} →{' '}
                    {formatLongDate(medication.duration.endDate)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>
        </Section>

        <Section title="Dose times">
          <Card outlined elevated={0}>
            <View style={{ gap: theme.space.sm }}>
              {resolveDailyTimes(medication.schedule).map((time, index, all) => (
                <View key={time}>
                  <ListRow
                    leading={<Icon name="clock" size={18} tone="brand" />}
                    title={formatClockTime(time)}
                    subtitle={`${medication.dosageAmount} ${medication.dosageUnit}`}
                  />
                  {index < all.length - 1 ? <Divider /> : null}
                </View>
              ))}
            </View>
          </Card>
        </Section>

        {medication.inventoryCount !== null ? (
          <Section title="Inventory">
            <Card
              outlined
              elevated={0}
              tone={stock === 'empty' ? 'danger' : stock === 'low' ? 'warning' : 'default'}
            >
              <View style={{ gap: theme.space.md }}>
                <Row gap="lg">
                  <Icon name="package" size={24} tone={stock === 'healthy' ? 'brand' : 'warning'} />
                  <View style={{ ...theme.layout.fill, gap: 2 }}>
                    <Text variant="subheading">
                      {medication.inventoryCount} {medication.dosageUnit === 'pill' ? 'pills' : 'units'} left
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {stockDays !== null
                        ? `About ${stockDays} ${stockDays === 1 ? 'day' : 'days'} of doses · warning at ${medication.refillThreshold}`
                        : `Warning at ${medication.refillThreshold} left`}
                    </Text>
                  </View>
                </Row>
                <Button label="Record a refill" iconLeft="plus" variant="secondary" onPress={() => setRefillOpen(true)} />
              </View>
            </Card>
          </Section>
        ) : null}

        {recentLogs.length > 0 ? (
          <Section title="Recent doses">
            <Card outlined elevated={0}>
              <View>
                {recentLogs.map((log, index) => (
                  <View key={log.id}>
                    <ListRow
                      leading={
                        <Icon
                          name={
                            log.status === 'taken' ? 'checkCircle'
                            : log.status === 'skipped' ? 'skipForward'
                            : log.status === 'snoozed' ? 'snooze'
                            : 'alert'
                          }
                          size={18}
                          tone={
                            log.status === 'taken' ? 'success'
                            : log.status === 'missed' ? 'danger'
                            : 'secondary'
                          }
                        />
                      }
                      title={`${formatRelativeDay(log.date)} at ${formatClockTime(log.scheduledTime)}`}
                      subtitle={capitalise(log.status)}
                    />
                    {index < recentLogs.length - 1 ? <Divider /> : null}
                  </View>
                ))}
              </View>
            </Card>
          </Section>
        ) : null}

        <Section title="Manage">
          <View style={{ gap: theme.space.sm }}>
            {!isArchived ? (
              <Button label="Archive this course" iconLeft="archive" variant="secondary" fullWidth onPress={confirmArchive} />
            ) : null}
            <Button label="Delete permanently" iconLeft="trash" variant="danger" fullWidth onPress={confirmDelete} />
          </View>
        </Section>
      </Screen>

      <Sheet
        visible={refillOpen}
        onClose={() => setRefillOpen(false)}
        title="Record a refill"
        subtitle={`How many did you add to your ${medication.name} supply?`}
      >
        <Stepper
          label="units added"
          value={refillAmount}
          min={1}
          max={500}
          step={medication.dosageUnit === 'pill' ? 10 : 5}
          onChange={setRefillAmount}
        />
        <Text variant="caption" tone="secondary">
          New total: {(medication.inventoryCount ?? 0) + refillAmount}
        </Text>
        <Button
          label="Add to inventory"
          iconLeft="check"
          fullWidth
          onPress={async () => {
            await store.recordRefill(medication.id, refillAmount);
            setRefillOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
