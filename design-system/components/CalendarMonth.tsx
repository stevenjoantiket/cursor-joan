/**
 * <CalendarMonth> — a stateless month grid, used by the custom start/end date
 * picker and by the adherence history heat grid.
 *
 * It renders whatever `getDayState` returns, so the same grid can show a
 * selected range, a heat map of adherence, or plain availability. All dates
 * cross this boundary as `YYYY-MM-DD` strings to stay timezone-safe.
 */
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { IconButton } from './Button';
import { Row } from '../primitives/Stack';
import { Text } from './Text';

export type DayState = {
  /** Painted behind the day number. Undefined leaves it transparent. */
  fill?: string;
  textColor?: string;
  /** Continuous range highlight — squares the corners between endpoints. */
  inRange?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  disabled?: boolean;
  /** A dot under the number, for "something happened here". */
  marker?: string;
  accessibilityLabel?: string;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** Days in the visible grid, Monday-first, padded with nulls for alignment. */
export function buildMonthGrid(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  // getUTCDay(): 0=Sun. Shift so Monday is column 0.
  const leadingBlanks = (first.getUTCDay() + 6) % 7;

  const cells: (string | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${pad(monthIndex + 1)}-${pad(day)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CalendarMonth({
  year,
  monthIndex,
  onChangeMonth,
  getDayState,
  onSelectDay,
  compact = false,
}: {
  year: number;
  /** 0-based, matching Date's month index. */
  monthIndex: number;
  /** Omit to hide the month navigation (e.g. in a static history grid). */
  onChangeMonth?: (delta: -1 | 1) => void;
  getDayState: (isoDate: string) => DayState;
  onSelectDay?: (isoDate: string) => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  const cells = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);
  const cellSize = compact ? 32 : 42;

  return (
    <View style={{ gap: theme.space.md }}>
      <Row justify="space-between">
        {onChangeMonth ? (
          <IconButton
            icon="chevronLeft"
            label="Previous month"
            variant="ghost"
            size={40}
            onPress={() => onChangeMonth(-1)}
          />
        ) : null}
        <Text variant="subheading" accessibilityRole="header">
          {MONTH_NAMES[monthIndex]} {year}
        </Text>
        {onChangeMonth ? (
          <IconButton
            icon="chevronRight"
            label="Next month"
            variant="ghost"
            size={40}
            onPress={() => onChangeMonth(1)}
          />
        ) : null}
      </Row>

      <Row justify="space-between">
        {WEEKDAYS.map((weekday) => (
          <View key={weekday} style={{ width: cellSize, alignItems: 'center' }}>
            <Text variant="caption" tone="tertiary">
              {weekday.slice(0, compact ? 1 : 3)}
            </Text>
          </View>
        ))}
      </Row>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((isoDate, index) => {
          if (!isoDate) {
            return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: cellSize + 6 }} />;
          }

          const state = getDayState(isoDate);
          const dayNumber = Number(isoDate.slice(8, 10));
          const interactive = Boolean(onSelectDay) && !state.disabled;

          const radius = state.inRange && !state.isRangeStart && !state.isRangeEnd
            ? 0
            : cellSize / 2;

          return (
            <View
              key={isoDate}
              style={{ width: `${100 / 7}%`, height: cellSize + 6, alignItems: 'center', justifyContent: 'center' }}
            >
              {state.inRange ? (
                <View
                  style={{
                    position: 'absolute',
                    left: state.isRangeStart ? '50%' : 0,
                    right: state.isRangeEnd ? '50%' : 0,
                    height: cellSize,
                    backgroundColor: theme.colors.brandSubtle,
                  }}
                />
              ) : null}
              <Pressable
                disabled={!interactive}
                onPress={() => onSelectDay?.(isoDate)}
                accessibilityRole={interactive ? 'button' : undefined}
                accessibilityLabel={state.accessibilityLabel ?? `${dayNumber} ${MONTH_NAMES[monthIndex]}`}
                accessibilityState={{ disabled: state.disabled }}
                style={({ pressed }) => ({
                  width: cellSize,
                  height: cellSize,
                  borderRadius: radius,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: state.fill ?? 'transparent',
                  opacity: state.disabled ? 0.3 : pressed ? 0.6 : 1,
                })}
              >
                <Text
                  variant={compact ? 'caption' : 'label'}
                  style={{ color: state.textColor ?? theme.colors.textPrimary }}
                >
                  {dayNumber}
                </Text>
                {state.marker ? (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 3,
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: state.marker,
                    }}
                  />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
