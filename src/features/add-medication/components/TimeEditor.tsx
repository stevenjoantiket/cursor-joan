/**
 * src/features/add-medication/components/TimeEditor.tsx
 *
 * Editing the list of times a medication is taken.
 *
 * Rather than pull in a native date-time picker (which looks different on each
 * platform and cannot be themed), times are adjusted with the design system's own
 * <Stepper> in 5-minute increments, plus one-tap presets for the times people
 * actually pick. Everything stays inside the design system's visual language.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  Row,
  Section,
  Sheet,
  Text,
  useTheme,
} from '@ds';
import type { ClockTime } from '../../../domain/types';
import { clockTimeFromMinutes, formatClockTime, minutesOfDay } from '../../../utils/date';

const PRESET_TIMES: { time: ClockTime; label: string }[] = [
  { time: '07:00', label: '7:00 AM' },
  { time: '08:00', label: '8:00 AM' },
  { time: '09:00', label: '9:00 AM' },
  { time: '12:00', label: '12:00 PM' },
  { time: '14:00', label: '2:00 PM' },
  { time: '18:00', label: '6:00 PM' },
  { time: '20:00', label: '8:00 PM' },
  { time: '22:00', label: '10:00 PM' },
];

export function TimeList({
  times,
  onChange,
  /** Interval schedules derive their times, so the list is read-only. */
  readOnly = false,
  maxTimes = 8,
}: {
  times: ClockTime[];
  onChange: (times: ClockTime[]) => void;
  readOnly?: boolean;
  maxTimes?: number;
}) {
  const theme = useTheme();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const sorted = [...times].sort((a, b) => minutesOfDay(a) - minutesOfDay(b));

  const replaceAt = (index: number, next: ClockTime) => {
    const updated = [...sorted];
    updated[index] = next;
    // De-duplicate: two reminders at the same minute is never intended.
    onChange(Array.from(new Set(updated)).sort((a, b) => minutesOfDay(a) - minutesOfDay(b)));
  };

  const removeAt = (index: number) => {
    onChange(sorted.filter((_, position) => position !== index));
  };

  const addTime = () => {
    // Offer a slot a few hours after the last one, so the default is plausible.
    const last = sorted[sorted.length - 1];
    const candidate = last ? clockTimeFromMinutes(minutesOfDay(last) + 240) : '09:00';
    const unique = sorted.includes(candidate) ? clockTimeFromMinutes(minutesOfDay(candidate) + 30) : candidate;
    onChange([...sorted, unique].sort((a, b) => minutesOfDay(a) - minutesOfDay(b)));
  };

  return (
    <View style={{ gap: theme.space.sm }}>
      {sorted.map((time, index) => (
        <Card key={`${time}-${index}`} outlined elevated={0} padding="md">
          <Row gap="md">
            <Icon name="clock" size={20} tone="brand" />
            <Text variant="bodyStrong" style={theme.layout.fill}>
              {formatClockTime(time)}
            </Text>
            {!readOnly ? (
              <Row gap="xs">
                <IconButton
                  icon="edit"
                  label={`Change the ${formatClockTime(time)} dose time`}
                  variant="ghost"
                  size={40}
                  onPress={() => setEditingIndex(index)}
                />
                {sorted.length > 1 ? (
                  <IconButton
                    icon="trash"
                    label={`Remove the ${formatClockTime(time)} dose`}
                    variant="ghost"
                    size={40}
                    tone="danger"
                    onPress={() => removeAt(index)}
                  />
                ) : null}
              </Row>
            ) : null}
          </Row>
        </Card>
      ))}

      {!readOnly && sorted.length < maxTimes ? (
        <Button label="Add another time" iconLeft="plus" variant="ghost" onPress={addTime} />
      ) : null}

      <TimePickerSheet
        visible={editingIndex !== null}
        value={editingIndex !== null ? sorted[editingIndex] ?? '09:00' : '09:00'}
        onClose={() => setEditingIndex(null)}
        onConfirm={(next) => {
          if (editingIndex !== null) replaceAt(editingIndex, next);
          setEditingIndex(null);
        }}
      />
    </View>
  );
}

/** A themed time picker: presets first, then coarse and fine adjustment. */
export function TimePickerSheet({
  visible,
  value,
  onClose,
  onConfirm,
  title = 'Dose time',
}: {
  visible: boolean;
  value: ClockTime;
  onClose: () => void;
  onConfirm: (time: ClockTime) => void;
  title?: string;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<ClockTime>(value);

  // Re-seed the local draft each time the sheet is opened on a new value.
  React.useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const shift = (minutes: number) => setDraft(clockTimeFromMinutes(minutesOfDay(draft) + minutes));

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle="Choose a preset, or nudge it to the minute.">
      <Card tone="brand" elevated={0}>
        <Text variant="display" align="center" tone="brand">
          {formatClockTime(draft)}
        </Text>
      </Card>

      <Row gap="sm" justify="center">
        <Button label="−1 hr" variant="secondary" size="sm" onPress={() => shift(-60)} />
        <Button label="−5 min" variant="secondary" size="sm" onPress={() => shift(-5)} />
        <Button label="+5 min" variant="secondary" size="sm" onPress={() => shift(5)} />
        <Button label="+1 hr" variant="secondary" size="sm" onPress={() => shift(60)} />
      </Row>

      <Section title="Common times">
        <Row gap="sm" wrap>
          {PRESET_TIMES.map((preset) => (
            <Chip
              key={preset.time}
              label={preset.label}
              selected={draft === preset.time}
              size="sm"
              onPress={() => setDraft(preset.time)}
            />
          ))}
        </Row>
      </Section>

      <Button label="Use this time" fullWidth onPress={() => onConfirm(draft)} style={{ marginTop: theme.space.sm }} />
    </Sheet>
  );
}
