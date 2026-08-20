/**
 * design-system/theme/useBreakpoint.ts
 *
 * Reports the current responsive size. Backed by useWindowDimensions, so it
 * re-renders on a browser resize and on a device rotation alike.
 *
 * Screens branch on the *name* (or the booleans), never on a raw width.
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  breakpointFor,
  contentMaxWidth,
  gridColumns,
  gutterFor,
  navRailWidthFor,
  type BreakpointName,
} from '../tokens';

export type BreakpointInfo = {
  width: number;
  height: number;
  name: BreakpointName;
  isCompact: boolean;
  isMedium: boolean;
  /** True from 1024px up — the only size with room for a second column. */
  isExpanded: boolean;
  /** True at medium and above; the shorthand most layouts actually want. */
  isWide: boolean;
  maxContentWidth: number | undefined;
  gutter: number;
  columns: number;
  /** Horizontal space the side navigation takes; 0 when nav is a bottom bar. */
  navRailWidth: number;
};

export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const name = breakpointFor(width);
    return {
      width,
      height,
      name,
      isCompact: name === 'compact',
      isMedium: name === 'medium',
      isExpanded: name === 'expanded',
      isWide: name !== 'compact',
      maxContentWidth: contentMaxWidth[name],
      gutter: gutterFor[name],
      columns: gridColumns[name],
      navRailWidth: navRailWidthFor[name],
    };
  }, [width, height]);
}
