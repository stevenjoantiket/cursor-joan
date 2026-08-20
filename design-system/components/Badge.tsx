/**
 * <Badge> — a small status marker. Pairs an icon with a word; never a bare dot,
 * because a coloured dot alone tells a colour-blind user nothing.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

export function Badge({
  label,
  icon,
  tone = 'neutral',
}: {
  label: string;
  icon?: IconName;
  tone?: BadgeTone;
}) {
  const theme = useTheme();

  const spec = {
    neutral: { bg: theme.colors.surfaceMuted, fg: theme.colors.textSecondary },
    brand: { bg: theme.colors.brandSubtle, fg: theme.colors.brand },
    success: { bg: theme.colors.successSubtle, fg: theme.colors.onSuccessSubtle },
    warning: { bg: theme.colors.warningSubtle, fg: theme.colors.onWarningSubtle },
    danger: { bg: theme.colors.dangerSubtle, fg: theme.colors.onDangerSubtle },
  }[tone];

  return (
    <View
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.xxs,
        paddingHorizontal: theme.space.sm,
        paddingVertical: theme.space.xxs,
        borderRadius: theme.radii.xs,
        backgroundColor: spec.bg,
      }}
    >
      {icon ? <Icon name={icon} size={13} color={spec.fg} /> : null}
      <Text variant="caption" style={{ color: spec.fg }}>
        {label}
      </Text>
    </View>
  );
}
