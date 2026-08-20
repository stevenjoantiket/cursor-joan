/**
 * <Stepper> — numeric adjustment without the keyboard, for dose counts and
 * inventory. Both buttons keep a 44pt target and the value is announced on
 * every change so a screen-reader user hears the result of their tap.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { IconButton } from './Button';
import { Text } from './Text';

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  suffix,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  suffix?: string;
}) {
  const theme = useTheme();

  const clamp = (next: number) => Math.max(min, Math.min(max, Math.round(next * 100) / 100));

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${value} ${suffix ?? ''}`.trim() }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') onChange(clamp(value + step));
        if (event.nativeEvent.actionName === 'decrement') onChange(clamp(value - step));
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space.md,
        paddingHorizontal: theme.space.xs,
        paddingVertical: theme.space.xs,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.surfaceMuted,
      }}
    >
      <IconButton
        icon="minus"
        label={`Decrease ${label}`}
        variant="secondary"
        size={40}
        onPress={() => onChange(clamp(value - step))}
      />
      <View style={{ minWidth: 64, alignItems: 'center' }}>
        <Text variant="subheading">{suffix ? `${value} ${suffix}` : String(value)}</Text>
      </View>
      <IconButton
        icon="plus"
        label={`Increase ${label}`}
        variant="secondary"
        size={40}
        onPress={() => onChange(clamp(value + step))}
      />
    </View>
  );
}
