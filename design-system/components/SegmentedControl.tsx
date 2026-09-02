/**
 * <SegmentedControl> — a single-choice switch for 2–4 short options.
 *
 * Used for the dosage unit toggle (mg / ml / pills / drops) and the archive
 * filters. The selected thumb slides, giving a spatial cue on top of the colour
 * change.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  accessibilityLabel,
  testID,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segmentWidth = options.length > 0 ? trackWidth / options.length : 0;
  const height = size === 'sm' ? 36 : 46;
  const inset = 3;

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: selectedIndex * segmentWidth,
      useNativeDriver: theme.motion.useNativeDriver,
      friction: theme.motion.spring.friction,
      tension: theme.motion.spring.tension,
    }).start();
  }, [selectedIndex, segmentWidth, thumbX, theme.motion.spring.friction, theme.motion.spring.tension]);

  const onLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width - inset * 2);
  };

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        height,
        flexDirection: 'row',
        padding: inset,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.surfaceMuted,
      }}
    >
      {trackWidth > 0 ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: inset,
            left: inset,
            width: segmentWidth,
            height: height - inset * 2,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.surface,
            transform: [{ translateX: thumbX }],
            ...theme.elevation(1),
          }}
        />
      ) : null}

      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            style={{ ...theme.layout.fill, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text
              variant={size === 'sm' ? 'caption' : 'label'}
              tone={isSelected ? 'primary' : 'secondary'}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
