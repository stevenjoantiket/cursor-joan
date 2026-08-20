/**
 * src/features/dashboard/DashboardScreen.tsx
 *
 * Today's schedule as a timeline.
 *
 * Layout reasoning: the day is grouped into Morning / Afternoon / Evening / Night
 * rather than shown as one flat list, because "what do I take this morning" is the
 * actual question being asked. Within a group, doses sit on a rail with their
 * time in the gutter so the eye can jump to the current part of the day.
 *
 * The header carries a date strip (7 days back to today, plus a peek at
 * tomorrow), so a missed dose can be logged retroactively without leaving home.
 *
 * On a wide window the summary blocks — the week's adherence and the add action —
 * move into <Screen>'s second column. Otherwise the timeline would be a 1180px-wide
 * ribbon of mostly empty card, and the summary would sit below the fold of a day
 * with a dozen doses.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  InlineNotice,
  PillShape,
  ProgressRing,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Text,
  useBreakpoint,
  useTheme,
} from '@ds';
import { useMedications } from '../../state/MedicationStore';
import type { AdherenceSummary, DoseOccurrence, DoseStatus } from '../../domain/types';
import { dayPartFor, dayPartLabels, formatClockTime, formatRelativeDay, addDays, toIsoDate } from '../../utils/date';
import { DoseCard } from './components/DoseCard';
import { TimelineRail } from './components/TimelineRail';
import { DoseActionSheet } from './components/DoseActionSheet';

export function DashboardScreen({
  onAddMedication,
  onOpenMedication,
}: {
  onAddMedication: () => void;
  onOpenMedication: (medicationId: string) => void;
}) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const store = useMedications();
  const { state, timeline, upNext, warnings, weeklyAdherence } = store;

  const [selectedDose, setSelectedDose] = useState<DoseOccurrence | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const today = toIsoDate();
  const isToday = state.selectedDate === today;

  // Group the day into named parts, dropping any part with no doses.
  const groups = useMemo(() => {
    const buckets = new Map<string, DoseOccurrence[]>();
    for (const dose of timeline) {
      const part = dayPartFor(dose.scheduledTime);
      const existing = buckets.get(part);
      if (existing) existing.push(dose);
      else buckets.set(part, [dose]);
    }
    return (['morning', 'afternoon', 'evening', 'night'] as const)
      .map((part) => ({ part, doses: buckets.get(part) ?? [] }))
      .filter((group) => group.doses.length > 0);
  }, [timeline]);

  const dayCounts = useMemo(() => {
    const counts = { taken: 0, remaining: 0, total: timeline.length };
    for (const dose of timeline) {
      if (dose.status === 'taken') counts.taken += 1;
      else if (dose.status === 'pending' || dose.status === 'snoozed') counts.remaining += 1;
    }
    return counts;
  }, [timeline]);

  const handleLog = async (
    dose: DoseOccurrence,
    status: Exclude<DoseStatus, 'pending'>,
    snoozeMinutes?: number,
  ) => {
    await store.logDose(dose, status, snoozeMinutes ? { snoozeMinutes } : undefined);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await store.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (state.status === 'loading') {
    return (
      <Screen>
        <Text variant="body" tone="secondary">
          Opening your records…
        </Text>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <InlineNotice
          tone="danger"
          title="Something went wrong"
          message={state.error ?? 'Your records could not be opened.'}
          actionLabel="Try again"
          onAction={onRefresh}
        />
      </Screen>
    );
  }

  const summary = (
    <>
      {timeline.length > 0 ? (
        <Section title="This week">
          <WeeklyAdherenceCard adherence={weeklyAdherence} />
        </Section>
      ) : null}

      {state.medications.length > 0 ? (
        <Button
          label="Add a medication"
          iconLeft="plus"
          variant="secondary"
          fullWidth
          onPress={onAddMedication}
        />
      ) : null}
    </>
  );

  return (
    <>
      <Screen
        aside={summary}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
      >
        <ScreenHeader
          title={isToday ? 'Today' : formatRelativeDay(state.selectedDate)}
          subtitle={
            dayCounts.total === 0
              ? 'Nothing scheduled'
              : dayCounts.remaining === 0
                ? 'All doses logged — nicely done'
                : `${dayCounts.remaining} of ${dayCounts.total} still to take`
          }
          action={
            <ProgressRing
              progress={dayCounts.total === 0 ? 0 : dayCounts.taken / dayCounts.total}
              size={56}
              thickness={6}
              label={`${dayCounts.taken}/${dayCounts.total}`}
              accessibilityLabel={`${dayCounts.taken} of ${dayCounts.total} doses taken`}
            />
          }
        />

        <DateStrip selectedDate={state.selectedDate} onSelect={store.selectDate} />

        {state.permission !== 'granted' && state.medications.length > 0 ? (
          <InlineNotice
            tone="brand"
            icon="bell"
            title="Reminders are off"
            message="Turn on notifications so med+capsule can remind you when a dose is due, even when the app is closed."
            actionLabel="Turn on reminders"
            onAction={store.requestNotificationPermission}
          />
        ) : null}

        {warnings.map((warning) => (
          <InlineNotice
            key={warning.medication.id}
            tone={warning.level === 'empty' ? 'danger' : 'warning'}
            icon="package"
            title={warning.level === 'empty' ? `Out of ${warning.medication.name}` : `${warning.medication.name} is running low`}
            message={warning.message}
            actionLabel="Record a refill"
            onAction={() => onOpenMedication(warning.medication.id)}
          />
        ))}

        {upNext && isToday ? <UpNextCard dose={upNext} onPress={() => setSelectedDose(upNext)} /> : null}

        {timeline.length === 0 ? (
          state.medications.length === 0 ? (
            <EmptyState
              icon="capsule"
              title="No medications yet"
              message="Add your first prescription and med+capsule will build a daily schedule and remind you when each dose is due."
              actionLabel="Add a medication"
              onAction={onAddMedication}
            />
          ) : (
            <EmptyState
              icon="calendar"
              title="Nothing scheduled"
              message={`You have no doses due on ${formatRelativeDay(state.selectedDate).toLowerCase()}.`}
            />
          )
        ) : (
          groups.map((group) => (
            <Section key={group.part} title={dayPartLabels[group.part]}>
              <View>
                {group.doses.map((dose, index) => (
                  <Row key={dose.key} align="stretch" style={{ minHeight: theme.layout.doseRowMinHeight }}>
                    <TimelineRail
                      time={dose.scheduledTime}
                      status={dose.status}
                      isFirst={index === 0}
                      isLast={index === group.doses.length - 1}
                    />
                    <View style={{ ...theme.layout.fill, paddingBottom: theme.space.md }}>
                      <DoseCard
                        dose={dose}
                        onPress={() => setSelectedDose(dose)}
                        onTake={() => void handleLog(dose, 'taken')}
                        onSkip={() => void handleLog(dose, 'skipped')}
                      />
                    </View>
                  </Row>
                ))}
              </View>
            </Section>
          ))
        )}

        {/* Below `expanded` these live at the end of the timeline, where they
            have always been; at `expanded` they are in the second column instead.
            <Screen> renders `aside` only at that size, so this is an either/or,
            never a duplicate. */}
        {breakpoint.isExpanded ? null : summary}
      </Screen>

      <DoseActionSheet
        dose={selectedDose}
        visible={selectedDose !== null}
        onClose={() => setSelectedDose(null)}
        onLog={(status, snoozeMinutes) => {
          if (selectedDose) void handleLog(selectedDose, status, snoozeMinutes);
        }}
        onUndo={() => {
          if (selectedDose) void store.undoDose(selectedDose);
        }}
        onOpenMedication={() => {
          if (selectedDose) onOpenMedication(selectedDose.medication.id);
        }}
      />
    </>
  );
}

/**
 * The last seven days at a glance. Its own component because it renders either at
 * the foot of the timeline or in the second column, depending on the window — and
 * a block that appears in two places must exist in only one.
 */
function WeeklyAdherenceCard({ adherence }: { adherence: AdherenceSummary }) {
  const theme = useTheme();
  const percent = Math.round(adherence.rate * 100);

  return (
    <Card outlined elevated={0}>
      <Row gap="lg">
        <ProgressRing
          progress={adherence.rate}
          size={72}
          thickness={8}
          label={`${percent}%`}
          color={adherence.rate >= 0.8 ? theme.colors.success : theme.colors.warning}
          accessibilityLabel={`Adherence ${percent} percent over the last seven days`}
        />
        <View style={{ ...theme.layout.fill, gap: theme.space.xs }}>
          <Text variant="bodyStrong">Last 7 days</Text>
          <Row gap="sm" wrap>
            <Badge label={`${adherence.taken} taken`} icon="check" tone="success" />
            {adherence.skipped > 0 ? (
              <Badge label={`${adherence.skipped} skipped`} icon="skipForward" />
            ) : null}
            {adherence.missed > 0 ? (
              <Badge label={`${adherence.missed} missed`} icon="alert" tone="danger" />
            ) : null}
          </Row>
        </View>
      </Row>
    </Card>
  );
}

/** "Up next" — the one dose the user most likely opened the app to deal with. */
function UpNextCard({ dose, onPress }: { dose: DoseOccurrence; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Card
      tone="brand"
      elevated={0}
      onPress={onPress}
      accessibilityLabel={`Up next: ${dose.medication.name} at ${formatClockTime(dose.scheduledTime)}`}
      accessibilityHint="Opens dose actions"
    >
      <Row gap="lg">
        <PillShape form={dose.medication.form} ink={dose.medication.ink} size={52} />
        <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
          <Text variant="caption" tone="brand" uppercase>
            {dose.status === 'snoozed' ? 'Snoozed' : 'Up next'}
          </Text>
          <Text variant="subheading">{dose.medication.name}</Text>
          <Text variant="caption" tone="secondary">
            {formatClockTime(dose.scheduledTime)} · {formatAmount(dose.medication.dosageAmount)}{' '}
            {dose.medication.dosageUnit}
          </Text>
        </View>
        <Icon name="chevronRight" size={22} tone="brand" />
      </Row>
    </Card>
  );
}

/**
 * A horizontal date strip: the last 7 days plus tomorrow. Past days are here so a
 * dose the user forgot to log can still be recorded honestly.
 *
 * Each cell flexes to share the row, which is right on a 390pt phone and wrong on a
 * wide window — nine cells spread over 800px become nine enormous buttons for
 * single-digit dates. Above compact the strip therefore stops growing and hugs the
 * leading edge, keeping the cells the size of the thing they contain.
 */
function DateStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const today = toIsoDate();
  const days = useMemo(
    () => Array.from({ length: 9 }, (_, index) => addDays(today, index - 7)),
    [today],
  );

  return (
    <Row
      gap="sm"
      style={{
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: breakpoint.isCompact ? undefined : theme.layout.dateStripMaxWidth,
      }}
    >
      {days.map((date) => {
        const isSelected = date === selectedDate;
        const isFuture = date > today;
        const dayNumber = Number(date.slice(8, 10));
        const weekday = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][
          new Date(`${date}T12:00:00`).getDay()
        ];

        return (
          <Pressable
            key={date}
            onPress={() => onSelect(date)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={formatRelativeDay(date)}
            style={{
              ...theme.layout.fill,
              alignItems: 'center',
              paddingVertical: theme.space.sm,
              borderRadius: theme.radii.sm,
              backgroundColor: isSelected ? theme.colors.brand : 'transparent',
              opacity: isFuture ? 0.45 : 1,
            }}
          >
            <Text variant="caption" tone={isSelected ? 'inverse' : 'tertiary'}>
              {weekday}
            </Text>
            <Text variant="label" tone={isSelected ? 'inverse' : 'primary'}>
              {dayNumber}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}
