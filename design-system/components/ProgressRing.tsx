/**
 * <ProgressRing> — the adherence dial. Also used at small sizes for the
 * "3 of 4 taken" marker on a medication row, and <ProgressBar> for inventory.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';
import { Text } from './Text';

export function ProgressRing({
  /** 0–1. Values outside the range are clamped. */
  progress,
  size = 96,
  thickness = 10,
  color,
  trackColor,
  label,
  caption,
  accessibilityLabel,
}: {
  progress: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /** Large text in the middle — usually a percentage. */
  label?: string;
  caption?: string;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${Math.round(clamped * 100)} percent`}
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? theme.colors.surfaceMuted}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? theme.colors.brand}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          // Start the sweep at 12 o'clock rather than 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ? (
        <View style={{ alignItems: 'center' }}>
          <Text variant={size >= 80 ? 'heading' : 'caption'}>{label}</Text>
          {caption ? (
            <Text variant="caption" tone="tertiary">
              {caption}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  progress,
  color,
  height = 8,
  accessibilityLabel,
}: {
  progress: number;
  color?: string;
  height?: number;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.colors.brand,
        }}
      />
    </View>
  );
}
