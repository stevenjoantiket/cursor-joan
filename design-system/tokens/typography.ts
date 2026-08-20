/**
 * design-system/tokens/typography.ts
 *
 * A six-step type scale. Steps are generous by default because the app is used
 * one-handed, often at 6am, by people of every age — body copy never goes below
 * 16pt and no interactive label below 15pt.
 *
 * `scaleFont` lets a screen honour the OS text-size setting without any screen
 * hard-coding a fontSize. Numerals in the timeline use `tabular` so times do
 * not jitter as they change.
 */
import { Platform, PixelRatio, type TextStyle } from 'react-native';

export const fontFamily = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }) as string,
  bold: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'mono';

type VariantStyle = Required<Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'>> &
  Pick<TextStyle, 'letterSpacing' | 'textTransform' | 'fontVariant' | 'fontFamily'>;

export const typography: Record<TypographyVariant, VariantStyle> = {
  /** Screen-owning number or greeting. One per screen, at most. */
  display: { fontSize: 34, lineHeight: 40, fontWeight: fontWeight.bold, letterSpacing: -0.6 },
  /** Screen title in the header. */
  title: { fontSize: 26, lineHeight: 32, fontWeight: fontWeight.bold, letterSpacing: -0.4 },
  /** Section heading inside a screen. */
  heading: { fontSize: 20, lineHeight: 26, fontWeight: fontWeight.semibold, letterSpacing: -0.2 },
  /** Card title — a medication name. */
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: fontWeight.semibold },
  body: { fontSize: 16, lineHeight: 23, fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: fontWeight.medium },
  /** Buttons, chips, field labels. Never smaller than this for anything tappable. */
  label: { fontSize: 15, lineHeight: 20, fontWeight: fontWeight.medium },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.medium, letterSpacing: 0.1 },
  /** Clock times on the timeline rail — tabular so columns stay aligned. */
  mono: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
};

/**
 * Multiplies a token font size by the OS font scale, clamped so a very large
 * accessibility setting enlarges text without shattering the layout.
 */
export function scaleFont(size: number, max = 1.35): number {
  const scale = Math.min(PixelRatio.getFontScale(), max);
  return Math.round(size * scale);
}
