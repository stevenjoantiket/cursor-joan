/**
 * <Input> — text and numeric entry.
 *
 * Always labelled: the visible label is also the accessibility label, so no
 * field depends on placeholder text alone. Errors render as text *and* a border
 * change, and are announced via accessibilityLiveRegion.
 */
import React, { useState } from 'react';
import { TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { scaleFont } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Row } from '../primitives/Stack';
import { Text } from './Text';

export type InputProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  /** Guidance shown under the field while it is valid. */
  hint?: string;
  error?: string;
  iconLeft?: IconName;
  /** Rendered flush to the right inside the field — e.g. a unit toggle. */
  accessory?: React.ReactNode;
  required?: boolean;
  containerStyle?: ViewStyle;
};

export function Input({
  label,
  hint,
  error,
  iconLeft,
  accessory,
  required = false,
  containerStyle,
  ...inputProps
}: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.focusRing
      : theme.colors.border;

  return (
    <View style={[{ gap: theme.space.sm }, containerStyle]}>
      <Row gap="xs">
        <Text variant="label" tone="secondary">
          {label}
        </Text>
        {required ? (
          <Text variant="label" tone="danger" accessibilityLabel="required">
            *
          </Text>
        ) : null}
      </Row>

      <Row
        gap="sm"
        style={{
          minHeight: theme.layout.minTouchTarget,
          paddingHorizontal: theme.space.lg,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          borderWidth: focused || error ? theme.borderWidth.thick : theme.borderWidth.hairline,
          borderColor,
        }}
      >
        {iconLeft ? <Icon name={iconLeft} size={20} tone="tertiary" /> : null}
        <TextInput
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={theme.colors.textTertiary}
          style={{
            ...theme.layout.fill,
            paddingVertical: theme.space.md,
            color: theme.colors.textPrimary,
            fontSize: scaleFont(theme.typography.body.fontSize),
            fontWeight: theme.typography.body.fontWeight,
          }}
        />
        {accessory}
      </Row>

      {error ? (
        <Row gap="xs" accessibilityLiveRegion="polite">
          <Icon name="alert" size={15} tone="danger" />
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        </Row>
      ) : hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
