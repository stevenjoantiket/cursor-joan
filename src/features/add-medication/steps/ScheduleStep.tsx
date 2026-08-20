/**
 * Step 3 — frequency, duration, and the optional inventory extension.
 *
 * The derived dose times are always shown, whichever mode is chosen. That is the
 * point of the step: the user should never have to work out what "every 4 hours"
 * turned into — the app states it plainly (08:00, 12:00, 16:00, 20:00, …) before
 * anything is saved.
 */
import React from 'react';
import { View } from 'react-native';
import {
  Card,
  Chip,
  Icon,
  Input,
  ProgressBar,
  Row,
  Section,
  SegmentedControl,
  Text,
  useTheme,
} from '@ds';
import type { Schedule } from '../../../domain/types';
import { describeSchedule } from '../../../domain/schedule';
import { daysOfStockRemaining } from '../../../domain/inventory';
import { formatClockTime, formatLongDate } from '../../../utils/date';
import type { DurationPreset, FieldErrors, MedicationDraft } from '../useMedicationDraft';
import { TimeList, TimePickerSheet } from '../components/TimeEditor';
import { DateRangePicker } from '../components/DateRangePicker';

const FREQUENCY_OPTIONS: { mode: Schedule['mode']; label: string }[] = [
  { mode: 'once-daily', label: 'Once a day' },
  { mode: 'twice-daily', label: 'Twice a day' },
  { mode: 'thrice-daily', label: '3 times a day' },
  { mode: 'interval', label: 'Every few hours' },
  { mode: 'custom-times', label: 'Custom times' },
];

const INTERVAL_CHOICES = [4, 6, 8, 12];

const DURATION_OPTIONS: { preset: DurationPreset; label: string }[] = [
  { preset: '1-day', label: '1 day' },
  { preset: '7-days', label: '7 days' },
  { preset: '1-month', label: '1 month' },
  { preset: 'ongoing', label: 'Ongoing' },
  { preset: 'custom', label: 'Custom dates' },
];

export function ScheduleStep({
  draft,
  errors,
  showErrors,
  dailyTimes,
  resolvedDuration,
  update,
  setFrequencyMode,
  setTimes,
  setInterval,
  suggestThreshold,
}: {
  draft: MedicationDraft;
  errors: FieldErrors;
  showErrors: boolean;
  dailyTimes: string[];
  resolvedDuration: { startDate: string; endDate: string | null };
  update: <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) => void;
  setFrequencyMode: (mode: Schedule['mode']) => void;
  setTimes: (times: string[]) => void;
  setInterval: (hours: number, anchorTime?: string) => void;
  suggestThreshold: () => void;
}) {
  const theme = useTheme();
  const [anchorPickerOpen, setAnchorPickerOpen] = React.useState(false);
  const isInterval = draft.schedule.mode === 'interval';

  return (
    <View style={{ gap: theme.space.xxl }}>
      <Section title="How often?">
        <Row gap="sm" wrap>
          {FREQUENCY_OPTIONS.map((option) => (
            <Chip
              key={option.mode}
              label={option.label}
              selected={draft.schedule.mode === option.mode}
              onPress={() => setFrequencyMode(option.mode)}
              testID={`frequency-${option.mode}`}
            />
          ))}
        </Row>
      </Section>

      {isInterval ? (
        <Section title="Hours between doses">
          <View style={{ gap: theme.space.md }}>
            <Row gap="sm" wrap>
              {INTERVAL_CHOICES.map((hours) => (
                <Chip
                  key={hours}
                  label={`Every ${hours} hrs`}
                  selected={draft.schedule.intervalHours === hours}
                  onPress={() => setInterval(hours)}
                />
              ))}
            </Row>

            <Input
              label="Or enter your own interval"
              keyboardType="number-pad"
              value={String(draft.schedule.intervalHours ?? 8)}
              onChangeText={(value) => {
                const hours = Number(value.replace(/[^0-9]/g, ''));
                setInterval(Number.isFinite(hours) && hours > 0 ? hours : 1);
              }}
              error={showErrors ? errors.interval : undefined}
              hint="Between 1 and 24 hours."
              accessory={
                <Text variant="caption" tone="tertiary">
                  hours
                </Text>
              }
            />

            <Card outlined elevated={0} padding="md">
              <Row gap="md">
                <Icon name="sunrise" size={20} tone="brand" />
                <View style={theme.layout.fill}>
                  <Text variant="caption" tone="tertiary" uppercase>
                    First dose of the day
                  </Text>
                  <Text variant="bodyStrong">
                    {formatClockTime(draft.schedule.anchorTime ?? '08:00')}
                  </Text>
                </View>
                <Chip label="Change" size="sm" onPress={() => setAnchorPickerOpen(true)} showSelectionMark={false} />
              </Row>
            </Card>
          </View>
        </Section>
      ) : null}

      <Section
        title={isInterval ? 'Your dose times' : 'Dose times'}
        caption={
          isInterval
            ? 'Worked out from your interval — these repeat every day.'
            : 'Tap a time to change it.'
        }
      >
        <TimeList times={dailyTimes} onChange={setTimes} readOnly={isInterval} />
        {showErrors && errors.times ? (
          <Text variant="caption" tone="danger">
            {errors.times}
          </Text>
        ) : null}
      </Section>

      <Card tone="brand" elevated={0} padding="md">
        <Row gap="md">
          <Icon name="bell" size={20} tone="brand" />
          <Text variant="caption" tone="secondary" style={theme.layout.fill}>
            {describeSchedule(draft.schedule)}. You will get a reminder at each time, even when the app is closed.
          </Text>
        </Row>
      </Card>

      <Section title="For how long?">
        <View style={{ gap: theme.space.md }}>
          <Row gap="sm" wrap>
            {DURATION_OPTIONS.map((option) => (
              <Chip
                key={option.preset}
                label={option.label}
                selected={draft.durationPreset === option.preset}
                onPress={() => update('durationPreset', option.preset)}
                testID={`duration-${option.preset}`}
              />
            ))}
          </Row>

          {draft.durationPreset === 'custom' ? (
            <View style={{ gap: theme.space.sm }}>
              <DateRangePicker
                startDate={draft.startDate}
                endDate={draft.customEndDate}
                onChange={({ startDate, endDate }) => {
                  update('startDate', startDate);
                  update('customEndDate', endDate);
                }}
              />
              {showErrors && errors.endDate ? (
                <Text variant="caption" tone="danger">
                  {errors.endDate}
                </Text>
              ) : null}
            </View>
          ) : (
            <Card outlined elevated={0} padding="md">
              <Row gap="md">
                <Icon name="calendar" size={20} tone="secondary" />
                <Text variant="caption" tone="secondary" style={theme.layout.fill}>
                  {resolvedDuration.endDate === null
                    ? `Starts ${formatLongDate(resolvedDuration.startDate)} and continues until you archive it.`
                    : `${formatLongDate(resolvedDuration.startDate)} → ${formatLongDate(resolvedDuration.endDate)}. It moves to your Archive automatically when it ends.`}
                </Text>
              </Row>
            </Card>
          )}
        </View>
      </Section>

      <Section
        title="Inventory (optional)"
        caption="Track how many you have and we will warn you before you run out."
      >
        <View style={{ gap: theme.space.md }}>
          <SegmentedControl
            options={[
              { value: 'off', label: "Don't track" },
              { value: 'on', label: 'Track stock' },
            ]}
            value={draft.trackInventory ? 'on' : 'off'}
            onChange={(value) => {
              const enabled = value === 'on';
              update('trackInventory', enabled);
              if (enabled) suggestThreshold();
            }}
            accessibilityLabel="Inventory tracking"
          />

          {draft.trackInventory ? (
            <View style={{ gap: theme.space.md }}>
              <Input
                label="Total you have now"
                keyboardType="number-pad"
                value={draft.inventoryCount}
                onChangeText={(value) => update('inventoryCount', value.replace(/[^0-9]/g, ''))}
                error={showErrors ? errors.inventory : undefined}
                iconLeft="package"
                hint="We count down as you log each dose as taken."
              />
              <Input
                label="Warn me when this many are left"
                keyboardType="number-pad"
                value={draft.refillThreshold}
                onChangeText={(value) => update('refillThreshold', value.replace(/[^0-9]/g, ''))}
                iconLeft="alert"
              />
              <InventoryProjection draft={draft} />
            </View>
          ) : null}
        </View>
      </Section>

      <TimePickerSheet
        visible={anchorPickerOpen}
        value={draft.schedule.anchorTime ?? '08:00'}
        title="First dose of the day"
        onClose={() => setAnchorPickerOpen(false)}
        onConfirm={(time) => {
          setInterval(draft.schedule.intervalHours ?? 8, time);
          setAnchorPickerOpen(false);
        }}
      />
    </View>
  );
}

/** Shows how long the entered stock will last at the chosen schedule. */
function InventoryProjection({ draft }: { draft: MedicationDraft }) {
  const theme = useTheme();
  const count = Number(draft.inventoryCount);
  const threshold = Number(draft.refillThreshold);
  if (!Number.isFinite(count) || count <= 0) return null;

  const daysLeft = daysOfStockRemaining({
    schedule: draft.schedule,
    dosageAmount: Number(draft.dosageAmount) || 1,
    dosageUnit: draft.dosageUnit,
    inventoryCount: count,
  });

  if (daysLeft === null) return null;

  return (
    <View style={{ gap: theme.space.sm }}>
      <ProgressBar
        progress={Math.min(1, count / Math.max(count, threshold * 4))}
        accessibilityLabel={`${count} units in stock`}
      />
      <Row gap="sm">
        <Icon name="info" size={16} tone="secondary" />
        <Text variant="caption" tone="secondary" style={theme.layout.fill}>
          {count} units lasts about {daysLeft} {daysLeft === 1 ? 'day' : 'days'} at this schedule.
        </Text>
      </Row>
    </View>
  );
}
