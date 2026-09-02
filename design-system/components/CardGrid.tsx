/**
 * <CardGrid> — lays cards out in one column on a phone and multiple columns as the
 * window grows, using the breakpoint's `columns` value.
 *
 * Implemented with percentage-width flex items rather than a CSS grid so it behaves
 * identically on native and on web. The gutters are drawn as item padding inside a
 * negatively-margined container rather than with `gap`: `width: 50%` plus a 12pt
 * `gap` is wider than the row, so the second card would wrap to its own line and a
 * "two column" grid would silently render as one. The final row is left-aligned
 * rather than stretched, so three cards in a two-column grid don't produce one
 * double-width card.
 *
 * Cards in the same row are given equal height. A flex-wrap row already stretches
 * its item wrappers to the tallest in the line, but a card sizes itself to its own
 * content and leaves the rest of the wrapper empty — so a medication with a stock
 * warning made its neighbours look misaligned rather than merely shorter. Each
 * child is therefore cloned with `flex: 1` so it fills the height the row already
 * gave it. Pass `equalHeight={false}` for content that should keep its natural
 * height.
 */
import React from 'react';
import { View } from 'react-native';
import { useBreakpoint, useTheme } from '../theme';

/**
 * Adds `flex: 1` to a child so it fills its wrapper's height. Anything that is
 * not an element (a bare string) is returned untouched, and an existing style is
 * kept — RN flattens nested style arrays, so appending is safe.
 */
function stretch(child: React.ReactNode): React.ReactNode {
  if (!React.isValidElement(child)) return child;
  const existing = (child.props as { style?: unknown }).style;
  return React.cloneElement(child as React.ReactElement<{ style?: unknown }>, {
    style: [existing, { flex: 1 }],
  });
}

export function CardGrid({
  children,
  /** Cap the column count below what the breakpoint would otherwise allow. */
  maxColumns,
  /** Let each card keep its natural height, leaving row bottoms ragged. */
  equalHeight = true,
}: {
  children: React.ReactNode;
  maxColumns?: number;
  equalHeight?: boolean;
}) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();

  const columns = Math.max(1, Math.min(breakpoint.columns, maxColumns ?? Infinity));
  const items = React.Children.toArray(children).filter(Boolean);
  const gap = theme.space.md;

  if (columns === 1) {
    return <View style={{ gap }}>{items}</View>;
  }

  const halfGap = gap / 2;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        // Pull the outer half-gutters back off the content column's edges, so the
        // grid lines up with the single-column layout above and below it.
        marginHorizontal: -halfGap,
        // Cancel the bottom margin the last row carries.
        marginBottom: -gap,
      }}
    >
      {items.map((child, index) => (
        <View
          key={index}
          style={{
            width: `${100 / columns}%`,
            paddingHorizontal: halfGap,
            marginBottom: gap,
            minWidth: 0,
          }}
        >
          {equalHeight ? stretch(child) : child}
        </View>
      ))}
    </View>
  );
}
