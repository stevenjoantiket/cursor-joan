/**
 * design-system/tokens/radii.ts
 *
 * Corner radii. The app's visual signature is the capsule, so `pill` shows up
 * on buttons and chips while cards stay at `lg` to avoid a bubbly look.
 */

export const radii = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  /** Fully rounded — resolves to half the height of whatever it is applied to. */
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;

export const borderWidth = {
  none: 0,
  hairline: 1,
  thick: 2,
  /** Selection outline on visual pickers — thick enough to read without colour. */
  selected: 2.5,
} as const;
