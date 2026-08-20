/**
 * design-system/tokens/spacing.ts
 *
 * A 4pt base grid. `space.md` (16) is the standard gutter; screens use
 * `layout.screenPadding` so every screen shares one horizontal rhythm.
 */

export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
} as const;

export type SpaceToken = keyof typeof space;

export const layout = {
  screenPadding: space.xl,
  /** Vertical gap between stacked cards in a list. */
  listGap: space.md,
  /** Smallest square any tappable element may occupy (Apple HIG / Material). */
  minTouchTarget: 48,
  /** Width of the timeline rail column on the dashboard. */
  timelineRailWidth: 64,
  /** Height of a dose row, keeping the timeline evenly paced. */
  doseRowMinHeight: 88,
  /** How far a swipe must travel before it commits to an action. */
  swipeCommitThreshold: 96,
  /** Bottom padding so the tab bar never covers the last card. */
  scrollBottomInset: 120,

  /** Height of the phone bottom tab bar. */
  tabBarHeight: 64,
  /**
   * Width of the side navigation on a browser window.
   *
   * A bottom tab bar is a thumb-reach affordance; a mouse pointer has no such
   * constraint, and a 1400px window that puts navigation at the very bottom edge
   * reads as a stretched phone app. So navigation moves to the leading edge as
   * soon as there is room: an icon-only rail at medium, labelled at expanded.
   */
  navRailWidth: 232,
  navRailCompactWidth: 76,
  /** The desktop-only secondary column (dashboard summary). */
  asideWidth: 320,
  /**
   * How wide the dashboard's day-picker strip may grow. Its cells flex to fill the
   * row, so without a cap a wide window turns nine dates into nine slabs.
   */
  dateStripMaxWidth: 520,

  /**
   * "Take the remaining space, and be allowed to shrink below your content."
   *
   * `flex: 1` alone is not enough on web. React Native's Yoga engine lets a flex
   * child shrink past its content width, so long text wraps; CSS defaults to
   * `min-width: auto`, which refuses to shrink and pushes the row wider than the
   * viewport instead. Every horizontal fill therefore needs an explicit
   * `minWidth: 0`, which is a no-op on native and the whole fix on web.
   *
   * Use `...theme.layout.fill` wherever a row child should absorb slack.
   */
  fill: { flex: 1, minWidth: 0 },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
