/**
 * <Text> — the only text primitive in the app.
 *
 * Screens choose a semantic `variant` and `tone`; they never pass fontSize or
 * color. Font size respects the OS text-size setting via scaleFont().
 */
import React, { useMemo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import { scaleFont, type TypographyVariant } from '../tokens';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  /** Renders in ALL CAPS with wider tracking — used for small section eyebrows. */
  uppercase?: boolean;
  children?: React.ReactNode;
};

export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  uppercase = false,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  const resolved = useMemo<TextStyle>(() => {
    const spec = theme.typography[variant];
    const toneColor: Record<TextTone, string> = {
      primary: theme.colors.textPrimary,
      secondary: theme.colors.textSecondary,
      tertiary: theme.colors.textTertiary,
      inverse: theme.colors.textInverse,
      brand: theme.colors.brand,
      success: theme.colors.success,
      warning: theme.colors.warning,
      danger: theme.colors.danger,
    };

    const scaled = scaleFont(spec.fontSize);
    return {
      ...spec,
      fontSize: scaled,
      lineHeight: Math.round(scaled * (spec.lineHeight / spec.fontSize)),
      color: toneColor[tone],
      textAlign: align,
      ...(uppercase
        ? { textTransform: 'uppercase' as const, letterSpacing: 0.7 }
        : null),
    };
  }, [theme, variant, tone, align, uppercase]);

  return <RNText style={[resolved, style]} {...rest} />;
}
