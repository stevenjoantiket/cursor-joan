/**
 * <Stack> / <Row> / <Spacer> — layout primitives so no screen writes a raw
 * flexDirection or a magic margin. `gap` takes a spacing token, never a number.
 */
import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import type { SpaceToken } from '../tokens';

type StackProps = ViewProps & {
  gap?: SpaceToken;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  flex?: number;
  wrap?: boolean;
  children?: React.ReactNode;
};

function useStackStyle(
  direction: 'row' | 'column',
  { gap, align, justify, flex, wrap }: StackProps,
): ViewStyle {
  const theme = useTheme();
  return {
    flexDirection: direction,
    gap: gap ? theme.space[gap] : undefined,
    alignItems: align,
    justifyContent: justify,
    flex,
    // See layout.fill — a flex child must be allowed to shrink on web too.
    minWidth: flex === undefined ? undefined : 0,
    flexWrap: wrap ? 'wrap' : undefined,
  };
}

export function Stack({ gap, align, justify, flex, wrap, style, ...rest }: StackProps) {
  const base = useStackStyle('column', { gap, align, justify, flex, wrap });
  return <View style={[base, style]} {...rest} />;
}

export function Row({ gap, align = 'center', justify, flex, wrap, style, ...rest }: StackProps) {
  const base = useStackStyle('row', { gap, align, justify, flex, wrap });
  return <View style={[base, style]} {...rest} />;
}

/** Pushes siblings apart in a Row, or adds vertical rhythm in a Stack. */
export function Spacer({ size }: { size?: SpaceToken }) {
  const theme = useTheme();
  if (!size) return <View style={theme.layout.fill} />;
  return <View style={{ width: theme.space[size], height: theme.space[size] }} />;
}

export function Divider({ inset = false }: { inset?: boolean }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: theme.borderWidth.hairline,
        backgroundColor: theme.colors.hairline,
        marginHorizontal: inset ? theme.space.lg : 0,
      }}
    />
  );
}
