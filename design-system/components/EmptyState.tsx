/**
 * <EmptyState> — what a screen shows before it has content. Always offers the
 * next action rather than just explaining the absence.
 */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: theme.space.giant,
        paddingHorizontal: theme.space.xl,
        gap: theme.space.md,
      }}
    >
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 38,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.brandSubtle,
        }}
      >
        <Icon name={icon} size={34} tone="brand" />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text variant="body" tone="secondary" align="center">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} iconLeft="plus" style={{ marginTop: theme.space.sm }} />
      ) : null}
    </View>
  );
}

/** An inline, non-blocking notice — low stock, permission not granted, etc. */
export function InlineNotice({
  tone = 'warning',
  icon = 'alert',
  title,
  message,
  actionLabel,
  onAction,
}: {
  tone?: 'brand' | 'warning' | 'danger' | 'success';
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();

  const spec = {
    brand: { bg: theme.colors.brandSubtle, fg: theme.colors.brand },
    warning: { bg: theme.colors.warningSubtle, fg: theme.colors.onWarningSubtle },
    danger: { bg: theme.colors.dangerSubtle, fg: theme.colors.onDangerSubtle },
    success: { bg: theme.colors.successSubtle, fg: theme.colors.onSuccessSubtle },
  }[tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        gap: theme.space.md,
        padding: theme.space.lg,
        borderRadius: theme.radii.md,
        backgroundColor: spec.bg,
      }}
    >
      <Icon name={icon} size={20} color={spec.fg} />
      <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
        <Text variant="label" style={{ color: spec.fg }}>
          {title}
        </Text>
        {message ? (
          <Text variant="caption" tone="secondary">
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Button label={actionLabel} onPress={onAction} variant="ghost" size="sm" style={{ marginTop: theme.space.xs, marginLeft: -theme.space.md }} />
        ) : null}
      </View>
    </View>
  );
}
