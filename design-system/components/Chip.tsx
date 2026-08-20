/**
 * <Chip> — a compact, toggleable tag. Used for instruction tags ("Before food")
 * and as a read-only badge on cards.
 *
 * Selection is signalled by fill, a 2.5pt border, *and* a check glyph, so it
 * never depends on colour alone.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  /** Shows the check glyph when selected. Off for read-only badges. */
  showSelectionMark?: boolean;
  testID?: string;
};

export function Chip({
  label,
  icon,
  selected = false,
  onPress,
  tone = 'neutral',
  size = 'md',
  showSelectionMark = true,
  testID,
}: ChipProps) {
  const theme = useTheme();

  const toneSpec = {
    neutral: { fg: theme.colors.textSecondary, bg: theme.colors.surfaceMuted, selBg: theme.colors.brandSubtle, selFg: theme.colors.brand, selBorder: theme.colors.brand },
    brand: { fg: theme.colors.brand, bg: theme.colors.brandSubtle, selBg: theme.colors.brandSubtle, selFg: theme.colors.brand, selBorder: theme.colors.brand },
    success: { fg: theme.colors.onSuccessSubtle, bg: theme.colors.successSubtle, selBg: theme.colors.successSubtle, selFg: theme.colors.success, selBorder: theme.colors.success },
    warning: { fg: theme.colors.onWarningSubtle, bg: theme.colors.warningSubtle, selBg: theme.colors.warningSubtle, selFg: theme.colors.warning, selBorder: theme.colors.warning },
    danger: { fg: theme.colors.onDangerSubtle, bg: theme.colors.dangerSubtle, selBg: theme.colors.dangerSubtle, selFg: theme.colors.danger, selBorder: theme.colors.danger },
  }[tone];

  const height = size === 'sm' ? 30 : 40;
  const iconSize = size === 'sm' ? 14 : 17;
  const fg = selected ? toneSpec.selFg : toneSpec.fg;

  const body = (
    <>
      {icon ? <Icon name={icon} size={iconSize} color={fg} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'label'} style={{ color: fg }}>
        {label}
      </Text>
      {selected && showSelectionMark ? <Icon name="check" size={iconSize} color={fg} /> : null}
    </>
  );

  const shell = {
    height,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.space.xs,
    paddingHorizontal: size === 'sm' ? theme.space.md : theme.space.lg,
    borderRadius: theme.radii.pill,
    backgroundColor: selected ? toneSpec.selBg : toneSpec.bg,
    borderWidth: selected ? theme.borderWidth.selected : theme.borderWidth.hairline,
    borderColor: selected ? toneSpec.selBorder : 'transparent',
  };

  if (!onPress) {
    return (
      <View style={shell} accessibilityLabel={label}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={theme.hitSlop}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [shell, pressed ? { opacity: 0.7 } : null]}
    >
      {body}
    </Pressable>
  );
}
