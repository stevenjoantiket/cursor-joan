/**
 * <Card> — the app's only container surface.
 *
 * `tone` shifts the fill for status (a missed dose, a low-stock warning) while
 * keeping one radius and one shadow language across the app. Pass `onPress` to
 * make the whole card a single accessible target rather than nesting buttons.
 *
 * A pressable card also lifts on pointer hover. On a phone that code never runs;
 * in a browser it is what tells you the card is a control and not just a panel,
 * since there is no touch to try it with.
 */
import React, { useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import type { ElevationLevel, SpaceToken } from '../tokens';

export type CardTone = 'default' | 'muted' | 'brand' | 'success' | 'warning' | 'danger';

export type CardProps = {
  children: React.ReactNode;
  tone?: CardTone;
  padding?: SpaceToken;
  elevated?: ElevationLevel;
  /** Draws a hairline instead of a shadow — used inside already-elevated sheets. */
  outlined?: boolean;
  /** A 4pt colour bar down the leading edge, for at-a-glance status scanning. */
  accentColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  testID?: string;
};

export function Card({
  children,
  tone = 'default',
  padding = 'lg',
  elevated = 1,
  outlined = false,
  accentColor,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  const toneFill: Record<CardTone, string> = {
    default: theme.colors.surface,
    muted: theme.colors.surfaceMuted,
    brand: theme.colors.brandSubtle,
    success: theme.colors.successSubtle,
    warning: theme.colors.warningSubtle,
    danger: theme.colors.dangerSubtle,
  };

  const base: ViewStyle = {
    backgroundColor: toneFill[tone],
    borderRadius: theme.radii.lg,
    padding: theme.space[padding],
    overflow: 'hidden',
    ...(outlined
      ? { borderWidth: theme.borderWidth.hairline, borderColor: theme.colors.border }
      : theme.elevation(elevated)),
  };

  const content = (
    <>
      {accentColor ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: accentColor,
          }}
        />
      ) : null}
      {children}
    </>
  );

  if (!onPress && !onLongPress) {
    return (
      <View style={[base, style]} testID={testID} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        base,
        // Hover only shifts a default-tone card: a status tone (a missed dose in
        // danger red) carries meaning that a hover fill must not overwrite.
        hovered && !pressed && tone === 'default'
          ? { backgroundColor: theme.colors.surfaceHovered }
          : null,
        pressed ? { backgroundColor: theme.colors.surfacePressed } : null,
        // The lift is a shadow step, so it works on a tone the fill can't touch.
        hovered && !outlined ? theme.elevation(Math.min(3, elevated + 1) as ElevationLevel) : null,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

/** A titled section wrapper — one heading, one body, consistent spacing. */
export function CardSection({
  children,
  gap = 'md',
}: {
  children: React.ReactNode;
  gap?: SpaceToken;
}) {
  const theme = useTheme();
  return <View style={{ gap: theme.space[gap] }}>{children}</View>;
}
