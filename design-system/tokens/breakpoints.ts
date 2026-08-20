/**
 * design-system/tokens/breakpoints.ts
 *
 * Responsive breakpoints.
 *
 * med+capsule is designed phone-first, but it also runs as a website, where a
 * single 390pt column stretched across a 2560px monitor is unreadable. These three
 * sizes are the only widths the app reasons about — no screen may test a raw pixel
 * number of its own.
 *
 *   compact   phone, and any narrow window                     < 700
 *   medium    tablet, split-screen, small laptop               700–1023
 *   expanded  desktop — wide enough for a second column        >= 1024
 */

import { layout } from './spacing';

export const breakpoints = {
  medium: 700,
  expanded: 1024,
} as const;

export type BreakpointName = 'compact' | 'medium' | 'expanded';

/**
 * How wide the content column is allowed to grow. Beyond this the column is
 * centred and the extra space becomes margin, so line lengths stay readable
 * rather than sprawling to the window edge.
 */
export const contentMaxWidth: Record<BreakpointName, number | undefined> = {
  compact: undefined, // fill the viewport
  medium: 760,
  expanded: 1180, // room for the timeline plus a summary rail
};

/** Horizontal gutter per size — a website earns more breathing room than a phone. */
export const gutterFor: Record<BreakpointName, number> = {
  compact: 20,
  medium: 32,
  expanded: 40,
};

/** Columns for card grids (the medication and archive lists). */
export const gridColumns: Record<BreakpointName, number> = {
  compact: 1,
  medium: 2,
  expanded: 3,
};

/**
 * Width the side navigation occupies at each size. Zero at compact, where
 * navigation is a bottom tab bar and therefore costs no horizontal room.
 */
export const navRailWidthFor: Record<BreakpointName, number> = {
  compact: 0,
  medium: layout.navRailCompactWidth,
  expanded: layout.navRailWidth,
};

export function breakpointFor(width: number): BreakpointName {
  if (width >= breakpoints.expanded) return 'expanded';
  if (width >= breakpoints.medium) return 'medium';
  return 'compact';
}
