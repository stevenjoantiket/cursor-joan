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
 */
import React from 'react';
import { View } from 'react-native';
import { useBreakpoint, useTheme } from '../theme';

export function CardGrid({
  children,
  /** Cap the column count below what the breakpoint would otherwise allow. */
  maxColumns,
}: {
  children: React.ReactNode;
  maxColumns?: number;
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
          {child}
        </View>
      ))}
    </View>
  );
}
