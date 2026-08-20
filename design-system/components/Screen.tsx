/**
 * <Screen> — the outer shell every screen uses. It owns the safe-area insets,
 * the background colour, the horizontal gutter and the scroll behaviour, so no
 * feature screen ever writes those values itself.
 */
import React from 'react';
import { ScrollView, StatusBar, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint, useTheme } from '../theme';
import { IconButton } from './Button';
import { Row } from '../primitives/Stack';
import { Text } from './Text';

export function Screen({
  children,
  /** false when the screen owns its own FlatList/ScrollView. */
  scroll = true,
  padded = true,
  footer,
  aside,
  refreshControl,
  testID,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Pinned above the safe area — used for a screen's primary action. */
  footer?: React.ReactNode;
  /**
   * A secondary column beside the content, rendered at `expanded` only — that is
   * the one size with the width for it.
   *
   * Below `expanded` it is not rendered at all, rather than being stacked at the
   * bottom. A screen that needs the same block on a phone renders it inline
   * itself, so its place in the reading order is a deliberate choice instead of
   * wherever the second column happened to collapse to.
   */
  aside?: React.ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
  testID?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();

  // Responsive gutter, and a centred column that stops growing past the
  // breakpoint's max width — a full-bleed 2560px line of text is unreadable.
  const gutter = padded ? breakpoint.gutter : 0;
  const columnStyle: ViewStyle = {
    width: '100%',
    maxWidth: breakpoint.maxContentWidth,
    alignSelf: 'center',
  };

  const showAside = aside != null && breakpoint.isExpanded;

  // With a second column the centred column becomes a row: content takes the
  // slack, the aside is a fixed width, and they scroll together.
  // `scroll={false}` means the screen owns its own scrolling child, which has to
  // be free to fill the height it was given.
  const fillStyle: ViewStyle = scroll ? {} : theme.layout.fill;

  const content = showAside ? (
    <View
      style={{
        flexDirection: 'row',
        gap: theme.space.xxxl,
        alignItems: 'flex-start',
        ...fillStyle,
      }}
    >
      <View style={{ ...theme.layout.fill, gap: theme.space.xl }}>{children}</View>
      <View style={{ width: theme.layout.asideWidth, gap: theme.space.xl }}>{aside}</View>
    </View>
  ) : (
    <View style={{ gap: theme.space.xl, ...fillStyle }}>{children}</View>
  );

  const body = scroll ? (
    <ScrollView
      testID={testID}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={{
        paddingHorizontal: gutter,
        // A browser window has no notch to clear but plenty of width, so wide
        // layouts open with more air above the title.
        paddingTop: breakpoint.isCompact ? theme.space.md : theme.space.xxxl,
        // `scrollBottomInset` exists to keep the last card out from under the
        // bottom tab bar. Above compact there is no bottom bar — navigation is a
        // rail — so that reserve would just be dead space.
        paddingBottom: breakpoint.isCompact
          ? theme.layout.scrollBottomInset
          : theme.space.giant,
        // The column centres itself inside the scroll view's full width.
        alignItems: 'center',
      }}
    >
      <View style={columnStyle}>{content}</View>
    </ScrollView>
  ) : (
    <View style={{ ...theme.layout.fill, paddingHorizontal: gutter, alignItems: 'center' }}>
      <View testID={testID} style={[columnStyle, theme.layout.fill]}>
        {content}
      </View>
    </View>
  );

  return (
    <View style={{ ...theme.layout.fill, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      {body}
      {footer ? (
        <View
          style={{
            paddingTop: theme.space.md,
            paddingBottom: insets.bottom + theme.space.md,
            paddingHorizontal: gutter,
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderTopWidth: theme.borderWidth.hairline,
            borderTopColor: theme.colors.border,
          }}
        >
          <View style={columnStyle}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

/** The large in-content title block at the top of a screen. */
export function ScreenHeader({
  title,
  subtitle,
  action,
  onBack,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space.sm }}>
      {onBack ? (
        <IconButton icon="chevronLeft" label="Go back" variant="ghost" size={40} onPress={onBack} />
      ) : null}
      <Row justify="space-between" align="flex-end" gap="md">
        <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </Row>
    </View>
  );
}

/** A labelled block inside a screen or form step. */
export function Section({
  title,
  caption,
  children,
  action,
}: {
  title?: string;
  caption?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space.md }}>
      {title || action ? (
        <Row justify="space-between" align="center" gap="sm">
          <View style={{ ...theme.layout.fill, gap: 2 }}>
            {title ? (
              <Text variant="caption" tone="tertiary" uppercase accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {caption ? (
              <Text variant="caption" tone="secondary">
                {caption}
              </Text>
            ) : null}
          </View>
          {action}
        </Row>
      ) : null}
      {children}
    </View>
  );
}
