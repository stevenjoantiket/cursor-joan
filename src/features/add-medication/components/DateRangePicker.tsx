/**
 * src/features/add-medication/components/DateRangePicker.tsx
 *
 * The custom start/end date picker, built on the design system's <CalendarMonth>.
 *
 * Tap once to set the start, tap again to set the end. A second tap *before* the
 * current start restarts the selection rather than producing an invalid backwards
 * range — that is the behaviour people expect from a booking calendar.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, CalendarMonth, Card, Row, Text, useTheme, type DayState } from '@ds';
import type { IsoDate } from '../../../domain/types';
import { daysBetween, formatLongDate, fromIsoDate, toIsoDate } from '../../../utils/date';

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  /** Blocks dates before this — the course cannot start in the past. */
  minDate = toIsoDate(),
}: {
  startDate: IsoDate;
  endDate: IsoDate | null;
  onChange: (next: { startDate: IsoDate; endDate: IsoDate | null }) => void;
  minDate?: IsoDate;
}) {
  const theme = useTheme();
  const initial = fromIsoDate(startDate);
  const [year, setYear] = useState(initial.getFullYear());
  const [monthIndex, setMonthIndex] = useState(initial.getMonth());

  const changeMonth = (delta: -1 | 1) => {
    const next = new Date(year, monthIndex + delta, 1);
    setYear(next.getFullYear());
    setMonthIndex(next.getMonth());
  };

  const handleSelect = (isoDate: IsoDate) => {
    // No end yet, or a tap at/before the start: begin a fresh range.
    if (endDate === null || isoDate <= startDate) {
      onChange({ startDate: isoDate, endDate: null });
      return;
    }
    onChange({ startDate, endDate: isoDate });
  };

  const getDayState = (isoDate: IsoDate): DayState => {
    const disabled = isoDate < minDate;
    const isStart = isoDate === startDate;
    const isEnd = endDate !== null && isoDate === endDate;
    const inRange = endDate !== null && isoDate >= startDate && isoDate <= endDate;

    if (isStart || isEnd) {
      return {
        fill: theme.colors.brand,
        textColor: theme.colors.onBrand,
        inRange,
        isRangeStart: isStart,
        isRangeEnd: isEnd,
        disabled,
        accessibilityLabel: `${formatLongDate(isoDate)}, ${isStart ? 'course start' : 'course end'}`,
      };
    }

    return {
      inRange,
      disabled,
      accessibilityLabel: formatLongDate(isoDate),
    };
  };

  const lengthInDays = endDate ? daysBetween(startDate, endDate) + 1 : null;

  return (
    <View style={{ gap: theme.space.lg }}>
      <Card outlined elevated={0}>
        <CalendarMonth
          year={year}
          monthIndex={monthIndex}
          onChangeMonth={changeMonth}
          getDayState={getDayState}
          onSelectDay={handleSelect}
        />
      </Card>

      <Row gap="md" justify="space-between">
        <View style={{ ...theme.layout.fill, gap: 2 }}>
          <Text variant="caption" tone="tertiary" uppercase>
            Starts
          </Text>
          <Text variant="bodyStrong">{formatLongDate(startDate)}</Text>
        </View>
        <View style={{ ...theme.layout.fill, gap: 2 }}>
          <Text variant="caption" tone="tertiary" uppercase>
            Ends
          </Text>
          <Text variant="bodyStrong" tone={endDate ? 'primary' : 'tertiary'}>
            {endDate ? formatLongDate(endDate) : 'Tap a day'}
          </Text>
        </View>
      </Row>

      {lengthInDays !== null ? (
        <Text variant="caption" tone="secondary" accessibilityLiveRegion="polite">
          {lengthInDays} {lengthInDays === 1 ? 'day' : 'days'} of doses.
        </Text>
      ) : null}

      {endDate !== null ? (
        <Button
          label="Clear end date"
          variant="ghost"
          size="sm"
          onPress={() => onChange({ startDate, endDate: null })}
        />
      ) : null}
    </View>
  );
}
