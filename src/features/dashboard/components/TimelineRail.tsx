/**
 * src/features/dashboard/components/TimelineRail.tsx
 *
 * The left-hand time column and the vertical rail that ties the day together.
 * The rail is what makes the dashboard read as a *timeline* rather than a list:
 * the marker is filled once a dose is resolved and hollow while it is still due,
 * so progress through the day is visible in the gutter alone.
 */
import React from 'react';
import { View } from 'react-native';
import { Icon, Text, useTheme, type IconName } from '@ds';
import type { DoseStatus } from '../../../domain/types';
import { formatClockTime } from '../../../utils/date';

export function TimelineRail({
  time,
  status,
  isFirst,
  isLast,
}: {
  time: string;
  status: DoseStatus;
  isFirst: boolean;
  isLast: boolean;
}) {
  const theme = useTheme();

  type Marker = { color: string; filled: boolean; icon: IconName | null };
  const markers: Record<DoseStatus, Marker> = {
    pending: { color: theme.colors.brand, filled: false, icon: null },
    taken: { color: theme.colors.success, filled: true, icon: 'check' },
    skipped: { color: theme.colors.textTertiary, filled: true, icon: 'close' },
    snoozed: { color: theme.colors.warning, filled: true, icon: 'snooze' },
    missed: { color: theme.colors.danger, filled: true, icon: 'alert' },
  };
  const marker = markers[status];

  return (
    <View
      style={{ width: theme.layout.timelineRailWidth, alignItems: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant="mono" tone="secondary" align="center">
        {formatClockTime(time)}
      </Text>

      <View style={{ ...theme.layout.fill, alignItems: 'center', marginTop: theme.space.xs }}>
        {/* Upper rail segment — omitted on the first row so the line starts at the marker. */}
        <View
          style={{
            width: 2,
            height: theme.space.sm,
            backgroundColor: isFirst ? 'transparent' : theme.colors.hairline,
          }}
        />
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: marker.filled ? marker.color : theme.colors.background,
            borderWidth: 2.5,
            borderColor: marker.color,
          }}
        >
          {marker.icon ? <Icon name={marker.icon} size={12} tone="inverse" strokeWidth={3} /> : null}
        </View>
        <View
          style={{
            ...theme.layout.fill,
            width: 2,
            backgroundColor: isLast ? 'transparent' : theme.colors.hairline,
          }}
        />
      </View>
    </View>
  );
}
