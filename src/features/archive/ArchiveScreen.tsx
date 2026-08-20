/**
 * src/features/archive/ArchiveScreen.tsx
 *
 * Finished and manually-archived courses.
 *
 * The archive is not a graveyard: its main job is making a past prescription easy
 * to bring back, because "the same thing I had in March" is the most common way a
 * repeat prescription gets entered. Each card therefore leads with the adherence
 * it achieved and offers Reactivate directly.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  CardGrid,
  Chip,
  EmptyState,
  Icon,
  PillShape,
  ProgressRing,
  Row,
  Screen,
  ScreenHeader,
  Section,
  SegmentedControl,
  Sheet,
  Text,
  useTheme,
} from '@ds';
import { useMedications } from '../../state/MedicationStore';
import type { DoseLog, Medication } from '../../domain/types';
import { adherenceForMedication, describeSchedule } from '../../domain/schedule';
import { describeCourseProgress, reactivationDuration } from '../../domain/archive';
import { addDays, daysBetween, formatLongDate, toIsoDate } from '../../utils/date';

type SortMode = 'recent' | 'name';

export function ArchiveScreen({
  onOpenMedication,
}: {
  onOpenMedication: (medicationId: string) => void;
}) {
  const store = useMedications();
  const { archivedMedications } = store;

  const [sort, setSort] = useState<SortMode>('recent');
  const [reactivating, setReactivating] = useState<Medication | null>(null);

  const sorted = useMemo(() => {
    const list = [...archivedMedications];
    if (sort === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Most recently finished first — that is what a repeat prescription looks for.
    return list.sort((a, b) => (b.archivedAt ?? b.updatedAt) - (a.archivedAt ?? a.updatedAt));
  }, [archivedMedications, sort]);

  return (
    <>
      <Screen>
        <ScreenHeader
          title="Archive"
          subtitle={
            archivedMedications.length === 0
              ? 'Finished courses will collect here.'
              : `${archivedMedications.length} finished ${archivedMedications.length === 1 ? 'course' : 'courses'}`
          }
        />

        {archivedMedications.length === 0 ? (
          <EmptyState
            icon="archive"
            title="Nothing archived yet"
            message="When a course reaches its end date it moves here automatically, with the adherence record it earned."
          />
        ) : (
          <>
            <SegmentedControl
              options={[
                { value: 'recent', label: 'Most recent' },
                { value: 'name', label: 'By name' },
              ]}
              value={sort}
              onChange={setSort}
              size="sm"
              accessibilityLabel="Sort archived medications"
            />

            <Section>
              {/* Capped at two: an archived card carries an adherence ring and a
                  Reactivate button, so it needs more width than a medication
                  card and reads badly squeezed into a third of the column. */}
              <CardGrid maxColumns={2}>
                {sorted.map((medication) => (
                  <ArchivedCard
                    key={medication.id}
                    medication={medication}
                    onOpen={() => onOpenMedication(medication.id)}
                    onReactivate={() => setReactivating(medication)}
                  />
                ))}
              </CardGrid>
            </Section>
          </>
        )}
      </Screen>

      <ReactivateSheet
        medication={reactivating}
        onClose={() => setReactivating(null)}
        onConfirm={async (endDate) => {
          if (!reactivating) return;
          await store.reactivateMedication(reactivating.id, endDate);
          setReactivating(null);
        }}
      />
    </>
  );
}

function ArchivedCard({
  medication,
  onOpen,
  onReactivate,
}: {
  medication: Medication;
  onOpen: () => void;
  onReactivate: () => void;
}) {
  const theme = useTheme();
  const store = useMedications();
  const [logs, setLogs] = useState<DoseLog[]>([]);

  // Adherence for an archived course spans its whole duration, which is usually
  // wider than the store's in-memory window — so load this medication's own logs.
  useEffect(() => {
    let cancelled = false;
    void store.logsForMedication(medication.id).then((result) => {
      if (!cancelled) setLogs(result);
    });
    return () => {
      cancelled = true;
    };
  }, [medication.id, store]);

  const adherence = useMemo(
    () => adherenceForMedication(medication, logs),
    [medication, logs],
  );

  const rateColor =
    adherence.rate >= 0.8
      ? theme.colors.success
      : adherence.rate >= 0.5
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <Card onPress={onOpen} accessibilityHint="Opens the full history for this medication">
      <View style={{ gap: theme.space.lg }}>
        <Row gap="lg">
          <PillShape form={medication.form} ink={medication.ink} size={44} muted />
          <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
            <Text variant="subheading" numberOfLines={1}>
              {medication.name}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {describeSchedule(medication.schedule)}
            </Text>
            <Row gap="xs" style={{ marginTop: theme.space.xxs }}>
              <Badge label={describeCourseProgress(medication)} icon="archive" />
            </Row>
          </View>
          <ProgressRing
            progress={adherence.rate}
            size={56}
            thickness={6}
            color={rateColor}
            label={`${Math.round(adherence.rate * 100)}%`}
            accessibilityLabel={`Adherence ${Math.round(adherence.rate * 100)} percent`}
          />
        </Row>

        <Row gap="sm" wrap>
          <Badge label={`${adherence.taken} taken`} icon="check" tone="success" />
          {adherence.skipped > 0 ? <Badge label={`${adherence.skipped} skipped`} icon="skipForward" /> : null}
          {adherence.missed > 0 ? <Badge label={`${adherence.missed} missed`} icon="alert" tone="danger" /> : null}
        </Row>

        <Row gap="sm">
          <Button label="Reactivate" iconLeft="refresh" size="sm" onPress={onReactivate} />
          <Button label="View history" iconRight="chevronRight" variant="ghost" size="sm" onPress={onOpen} />
        </Row>
      </View>
    </Card>
  );
}

/**
 * Reactivation asks for a fresh duration rather than reusing the old dates: the
 * original course is in the past, so silently restoring it would create a
 * schedule whose every dose has already been missed.
 */
function ReactivateSheet({
  medication,
  onClose,
  onConfirm,
}: {
  medication: Medication | null;
  onClose: () => void;
  onConfirm: (endDate: string | null) => Promise<void>;
}) {
  const theme = useTheme();
  const [choice, setChoice] = useState<'same' | '7-days' | '1-month' | 'ongoing'>('same');
  const [saving, setSaving] = useState(false);

  if (!medication) return null;

  const today = toIsoDate();
  const suggested = reactivationDuration(medication);
  const originalLength =
    medication.duration.endDate === null
      ? null
      : daysBetween(medication.duration.startDate, medication.duration.endDate) + 1;

  const endDateFor = (): string | null => {
    switch (choice) {
      case 'same':
        return suggested.endDate;
      case '7-days':
        return addDays(today, 6);
      case '1-month':
        return addDays(today, 29);
      case 'ongoing':
        return null;
      default:
        return suggested.endDate;
    }
  };

  const resolvedEnd = endDateFor();

  return (
    <Sheet
      visible={medication !== null}
      onClose={onClose}
      title={`Restart ${medication.name}`}
      subtitle="The new course starts today. Choose how long it should run."
    >
      <Row gap="lg" align="center">
        <PillShape form={medication.form} ink={medication.ink} size={56} />
        <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
          <Text variant="bodyStrong">
            {medication.dosageAmount} {medication.dosageUnit}
          </Text>
          <Text variant="caption" tone="secondary">
            {describeSchedule(medication.schedule)}
          </Text>
        </View>
      </Row>

      <Section title="How long this time?">
        <Row gap="sm" wrap>
          {originalLength !== null ? (
            <Chip
              label={`Same as before (${originalLength} ${originalLength === 1 ? 'day' : 'days'})`}
              selected={choice === 'same'}
              onPress={() => setChoice('same')}
            />
          ) : null}
          <Chip label="7 days" selected={choice === '7-days'} onPress={() => setChoice('7-days')} />
          <Chip label="1 month" selected={choice === '1-month'} onPress={() => setChoice('1-month')} />
          <Chip label="Ongoing" selected={choice === 'ongoing'} onPress={() => setChoice('ongoing')} />
        </Row>
      </Section>

      <Card tone="brand" elevated={0} padding="md">
        <Row gap="md">
          <Icon name="calendar" size={20} tone="brand" />
          <Text variant="caption" tone="secondary" style={theme.layout.fill}>
            {resolvedEnd === null
              ? `Starts today (${formatLongDate(today)}) with no end date.`
              : `${formatLongDate(today)} → ${formatLongDate(resolvedEnd)}. Reminders resume at ${describeSchedule(medication.schedule).toLowerCase()}.`}
          </Text>
        </Row>
      </Card>

      <Button
        label="Reactivate"
        iconLeft="refresh"
        fullWidth
        loading={saving}
        onPress={async () => {
          setSaving(true);
          try {
            await onConfirm(resolvedEnd);
          } finally {
            setSaving(false);
          }
        }}
      />
    </Sheet>
  );
}
