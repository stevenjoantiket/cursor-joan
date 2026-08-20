/**
 * <ListRow> — a settings-style row: leading slot, title/subtitle, trailing slot.
 * Keeps every list in the app on the same rhythm.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  showChevron = false,
  accessibilityLabel,
  accessibilityHint,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  const body = (
    <>
      {leading}
      <View style={{ ...theme.layout.fill, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? <Icon name="chevronRight" size={20} tone="tertiary" /> : null}
    </>
  );

  const shell = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.space.md,
    minHeight: theme.layout.minTouchTarget,
    paddingVertical: theme.space.md,
  };

  if (!onPress) return <View style={shell}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        shell,
        // The row has no card fill of its own, so hover is drawn as an inset
        // tinted block rather than a full-bleed background change.
        hovered
          ? {
              backgroundColor: theme.colors.surfaceHovered,
              borderRadius: theme.radii.sm,
              paddingHorizontal: theme.space.sm,
              marginHorizontal: -theme.space.sm,
            }
          : null,
        pressed ? { opacity: 0.6 } : null,
      ]}
    >
      {body}
    </Pressable>
  );
}
