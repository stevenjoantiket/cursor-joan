/**
 * <Button> — every tappable label in the app.
 *
 * Four variants, three sizes. Even the smallest size keeps a 48pt touch target
 * via hitSlop, and the pressed state changes both fill *and* scale so the
 * feedback is visible to someone who cannot distinguish the colour shift.
 */
import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useReducedMotion, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Stretches to the container width — the default for a screen's main action. */
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const isInert = disabled || loading;

  const animateTo = useCallback(
    (value: number) => {
      // The pressed *colour* change carries the feedback on its own, so dropping
      // the scale costs nothing when Reduce Motion is on.
      if (reducedMotion) return;
      Animated.spring(scale, {
        toValue: value,
        useNativeDriver: true,
        friction: theme.motion.spring.friction,
        tension: theme.motion.spring.tension,
      }).start();
    },
    [scale, reducedMotion, theme.motion.spring.friction, theme.motion.spring.tension],
  );

  const sizing = {
    sm: { height: 38, paddingH: theme.space.md, gap: theme.space.xs, icon: 18 },
    md: { height: 48, paddingH: theme.space.lg, gap: theme.space.sm, icon: 20 },
    lg: { height: 56, paddingH: theme.space.xl, gap: theme.space.sm, icon: 22 },
  }[size];

  const skin: Record<
    ButtonVariant,
    { bg: string; bgPressed: string; border: string; tone: 'inverse' | 'primary' | 'brand' | 'danger' }
  > = {
    primary: {
      bg: theme.colors.brand,
      bgPressed: theme.colors.brandStrong,
      border: 'transparent',
      tone: 'inverse',
    },
    secondary: {
      bg: theme.colors.surface,
      bgPressed: theme.colors.surfacePressed,
      border: theme.colors.borderStrong,
      tone: 'primary',
    },
    ghost: {
      bg: 'transparent',
      bgPressed: theme.colors.surfaceMuted,
      border: 'transparent',
      tone: 'brand',
    },
    danger: {
      bg: theme.colors.dangerSubtle,
      bgPressed: theme.colors.surfacePressed,
      border: 'transparent',
      tone: 'danger',
    },
  };

  const look = skin[variant];
  // `inverse` text sits on the brand fill; elsewhere it follows the variant tone.
  const contentTone = look.tone === 'inverse' ? 'inverse' : look.tone;

  return (
    <Animated.View
      style={[
        { transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'flex-start' },
        style,
      ]}
    >
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        disabled={isInert}
        hitSlop={theme.hitSlop}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isInert, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          {
            height: sizing.height,
            paddingHorizontal: sizing.paddingH,
            gap: sizing.gap,
            borderRadius: theme.radii.pill,
            backgroundColor: pressed ? look.bgPressed : look.bg,
            borderWidth: look.border === 'transparent' ? 0 : theme.borderWidth.hairline,
            borderColor: look.border,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        {iconLeft && !loading ? (
          <Icon name={iconLeft} size={sizing.icon} tone={contentTone} />
        ) : null}
        {loading ? <LoadingDots tone={contentTone} /> : <Text variant="label" tone={contentTone}>{label}</Text>}
        {iconRight && !loading ? (
          <Icon name={iconRight} size={sizing.icon} tone={contentTone} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** Three pulsing dots — lighter than a spinner and it matches the pill motif. */
function LoadingDots({ tone }: { tone: 'inverse' | 'primary' | 'brand' | 'danger' }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 3,
        duration: theme.motion.slow * 3,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, theme.motion.slow]);

  const color = {
    inverse: theme.colors.textInverse,
    primary: theme.colors.textPrimary,
    brand: theme.colors.brand,
    danger: theme.colors.danger,
  }[tone];

  return (
    <View style={{ flexDirection: 'row', gap: theme.space.xs }} accessibilityLabel="Working">
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            opacity: progress.interpolate({
              inputRange: [index - 0.5, index, index + 0.5, index + 1],
              outputRange: [0.35, 1, 0.35, 0.35],
              extrapolate: 'clamp',
            }),
          }}
        />
      ))}
    </View>
  );
}

/** Circular icon-only button — used for header actions and close affordances. */
export function IconButton({
  icon,
  onPress,
  label,
  variant = 'secondary',
  size = 44,
  tone,
  testID,
}: {
  icon: IconName;
  onPress: () => void;
  /** Required: an icon-only control has no visible text to announce. */
  label: string;
  variant?: 'secondary' | 'ghost' | 'brand';
  size?: number;
  tone?: 'primary' | 'secondary' | 'brand' | 'danger' | 'inverse';
  testID?: string;
}) {
  const theme = useTheme();

  const bg = {
    secondary: theme.colors.surface,
    ghost: 'transparent',
    brand: theme.colors.brand,
  }[variant];

  const iconTone = tone ?? (variant === 'brand' ? 'inverse' : 'primary');

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={theme.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? theme.colors.surfacePressed : bg,
        borderWidth: variant === 'secondary' ? theme.borderWidth.hairline : 0,
        borderColor: theme.colors.border,
      })}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} tone={iconTone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
