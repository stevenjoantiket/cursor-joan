/**
 * design-system/tokens/elevation.ts
 *
 * Three levels only. Shadows are soft and low-contrast; the design leans on
 * surface colour and spacing for hierarchy, not heavy drop shadows.
 */
import { Platform, type ViewStyle } from 'react-native';

export type ElevationLevel = 0 | 1 | 2 | 3;

/**
 * `#RRGGBB` (or `#RGB`) plus an opacity, as a CSS `rgba()` string.
 *
 * Only needed for the web branch below: native takes colour and opacity as two
 * separate style props, whereas a CSS box-shadow carries the alpha in the colour.
 * A value that isn't a hex triple is passed through untouched, so a theme is free
 * to hand us an `rgba()` shadow already.
 */
function withAlpha(color: string, opacity: number): string {
  const hex = color.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  const full = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!short && !full) return hex;
  const [r, g, b] = short
    ? short.slice(1).map((c) => parseInt(c + c, 16))
    : full!.slice(1).map((c) => parseInt(c, 16));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function elevation(level: ElevationLevel, shadowColor: string): ViewStyle {
  if (level === 0) return {};

  const spec = {
    1: { opacity: 0.06, radius: 8, offsetY: 2, android: 2 },
    2: { opacity: 0.09, radius: 16, offsetY: 6, android: 5 },
    3: { opacity: 0.14, radius: 28, offsetY: 12, android: 12 },
  }[level];

  return Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOpacity: spec.opacity,
      shadowRadius: spec.radius,
      shadowOffset: { width: 0, height: spec.offsetY },
    },
    android: { elevation: spec.android, shadowColor },
    // Web. react-native-web deprecates the `shadow*` props in favour of CSS
    // `boxShadow`, and warned once per elevated surface. A CSS blur radius is
    // roughly half the native shadowRadius, so it is halved here to keep the
    // three levels looking the same on both targets.
    default: {
      boxShadow: `0px ${spec.offsetY}px ${spec.radius / 2}px ${withAlpha(shadowColor, spec.opacity)}`,
      // Not in RN 0.74's ViewStyle type yet, though react-native-web reads it.
    } as unknown as ViewStyle,
  }) as ViewStyle;
}

/** Standard animation timings, so motion feels like one system. */
export const motion = {
  fast: 140,
  base: 220,
  slow: 320,
  /** Spring used when a swiped row snaps back. */
  spring: { friction: 9, tension: 90 },
  /**
   * Whether an animation may be handed to the native driver.
   *
   * The native driver runs an animation on the UI thread, off the JS thread —
   * which is why every animation in this design system asks for it. There is no
   * such thread on the web: react-native-web has no `RCTAnimation` module, so
   * asking for it there logs a warning on every single press and falls back to
   * the JS driver anyway. Passing this constant gets the same behaviour without
   * the console noise, and keeps the decision in one place rather than six.
   */
  useNativeDriver: Platform.OS !== 'web',
} as const;
