/**
 * src/navigation/AppNavBar.tsx
 *
 * The app's primary navigation, in the shape the window can afford. One component
 * with three renderings, chosen by breakpoint rather than by platform — a phone in
 * landscape and a small browser window get the same treatment because they have
 * the same width.
 *
 *   compact    a bottom tab bar. Thumb reach is the constraint on a phone.
 *   medium     a leading icon rail, 76pt wide.
 *   expanded   the same rail, widened and labelled, with the wordmark above it.
 *
 * Why the rail: a bottom bar exists because a thumb cannot reach the top of a
 * phone. A pointer has no such limit, and pinning navigation to the bottom edge of
 * a 1400px window puts it as far from both the content and the cursor as the screen
 * allows. Vertical space is also the scarce axis in a browser, so navigation moves
 * to the leading edge — where the horizontal room actually is.
 *
 * It is passed to the tab navigator as its `tabBar`, so React Navigation still owns
 * the routes, the focus state and the accessibility roles; only the drawing is
 * ours. At medium and above the rail is absolutely positioned, taking it out of the
 * navigator's column flow, and the scene is inset by the matching width.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon, Row, Text, useBreakpoint, useTheme, type IconName } from '@ds';
import type { TabParamList } from './RootNavigator';

const TAB_ICONS: Record<keyof TabParamList, IconName> = {
  Today: 'home',
  Medications: 'capsule',
  Archive: 'archive',
};

export function AppNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();

  const isRail = breakpoint.isWide;
  const showLabels = breakpoint.isExpanded;

  const items = state.routes.map((route, index) => {
    const descriptor = descriptors[route.key];
    const focused = state.index === index;

    return {
      routeKey: route.key,
      name: route.name as keyof TabParamList,
      focused,
      accessibilityLabel: descriptor?.options.tabBarAccessibilityLabel ?? route.name,
      onPress: () => {
        // emit() so a listener can preventDefault, exactly as the default bar does.
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      },
    };
  });

  if (!isRail) {
    return (
      <Row
        accessibilityRole="tablist"
        style={{
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: theme.borderWidth.hairline,
          height: theme.layout.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: theme.space.sm,
          justifyContent: 'space-around',
          alignItems: 'flex-start',
        }}
      >
        {items.map((item) => (
          // Vertical: icon over a caption label, the three sharing the width.
          // A row layout here sizes each item to its icon plus its label, and
          // three of those do not fit across a 390pt phone — 'Medications' alone
          // is most of a third of the bar.
          <NavItem key={item.routeKey} {...item} orientation="vertical" showLabel />
        ))}
      </Row>
    );
  }

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: breakpoint.navRailWidth,
        paddingTop: insets.top + theme.space.xl,
        paddingBottom: insets.bottom + theme.space.lg,
        paddingHorizontal: showLabels ? theme.space.md : theme.space.sm,
        gap: theme.space.xs,
        backgroundColor: theme.colors.surface,
        borderRightColor: theme.colors.border,
        borderRightWidth: theme.borderWidth.hairline,
      }}
    >
      <Wordmark compact={!showLabels} />
      <View style={{ height: theme.space.lg }} />
      {items.map((item) => (
        <NavItem
          key={item.routeKey}
          {...item}
          orientation={showLabels ? 'horizontal' : 'vertical'}
          showLabel={showLabels}
        />
      ))}
    </View>
  );
}

/**
 * One destination. The rail shape is a full-width row so the whole strip is the
 * click target, which is what a pointer expects of a sidebar link; the bottom-bar
 * shape stays a centred stack of icon-over-label.
 */
function NavItem({
  name,
  focused,
  accessibilityLabel,
  onPress,
  orientation,
  showLabel,
}: {
  routeKey?: string;
  name: keyof TabParamList;
  focused: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  orientation: 'horizontal' | 'vertical';
  showLabel: boolean;
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const isRow = orientation === 'horizontal' && showLabel;
  const tone = focused ? 'brand' : hovered ? 'primary' : 'tertiary';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: isRow ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: isRow ? 'flex-start' : 'center',
        gap: isRow ? theme.space.md : theme.space.xxs,
        minHeight: theme.layout.minTouchTarget,
        paddingHorizontal: isRow ? theme.space.md : theme.space.sm,
        paddingVertical: isRow ? theme.space.sm : theme.space.xs,
        borderRadius: theme.radii.md,
        // Selection is a fill *and* a colour change *and* the label weight, never
        // colour alone — the same rule the rest of the app follows.
        backgroundColor: focused
          ? theme.colors.brandSubtle
          : hovered
            ? theme.colors.surfaceHovered
            : 'transparent',
        alignSelf: isRow ? 'stretch' : 'auto',
        // The rail's items are as tall as their content and as wide as the rail.
        // The bottom bar's share the width evenly instead of taking a fixed size,
        // so "Medications" has room to sit on one line at 320pt and still looks
        // deliberate at 500 — and so there is no magic width to outgrow.
        ...(isRow ? null : theme.layout.fill),
      }}
    >
      <Icon name={TAB_ICONS[name]} size={24} tone={tone} />
      {showLabel ? (
        // The bottom bar's label sits under a 24pt icon in a 64pt bar, so it takes
        // the caption step; the rail has room for the reading size.
        <Text variant={isRow ? (focused ? 'label' : 'body') : 'caption'} tone={tone} numberOfLines={1}>
          {name}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** The rail's header: the app's own name, which a browser tab alone doesn't give. */
function Wordmark({ compact }: { compact: boolean }) {
  const theme = useTheme();

  if (compact) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: theme.space.sm }}>
        <Icon name="capsule" size={28} tone="brand" />
      </View>
    );
  }

  return (
    <Row gap="sm" style={{ paddingHorizontal: theme.space.md }}>
      <Icon name="capsule" size={24} tone="brand" />
      <Text variant="bodyStrong" numberOfLines={1}>
        med+capsule
      </Text>
    </Row>
  );
}
