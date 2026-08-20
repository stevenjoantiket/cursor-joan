/**
 * <Sheet> — the surface for secondary decisions (snooze duration, logging a past
 * dose, confirming an archive).
 *
 * It has two shapes, chosen by window width rather than by platform:
 *
 *   compact       a bottom sheet, rising from the edge nearest the thumb.
 *   medium/wide   a centred dialog. A sheet glued to the bottom of a 1400px
 *                 browser window puts the decision as far from the pointer as
 *                 the screen allows, and reads as a phone app that was stretched.
 *
 * Both shapes share the scrim, the header and the scrolling body, so a caller
 * never picks one — the layout does. Escape closes the dialog; the close button
 * is the accessible path out of either.
 *
 * Uses RN's own Modal so there is no navigation dependency.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint, useEscapeKey, useReducedMotion, useTheme } from '../theme';
import { IconButton } from './Button';
import { Row } from '../primitives/Stack';
import { Text } from './Text';

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  /** Caps the sheet height; content scrolls beyond it. */
  maxHeightRatio = 0.85,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeightRatio?: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const breakpoint = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const slide = useRef(new Animated.Value(0)).current;

  const asDialog = breakpoint.isWide;

  useEscapeKey(visible, onClose);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      // Reduce Motion keeps the fade but drops the travel to zero duration, so the
      // sheet appears in place rather than rushing up the screen.
      duration: reducedMotion ? 0 : visible ? theme.motion.base : theme.motion.fast,
      useNativeDriver: true,
    }).start();
  }, [visible, slide, reducedMotion, theme.motion.base, theme.motion.fast]);

  // A dialog drops in a short distance; a bottom sheet travels the height of the
  // panel. Both are cancelled by Reduce Motion.
  const travel = reducedMotion ? 0 : asDialog ? -16 : 420;

  const panelStyle = asDialog
    ? {
        width: '100%' as const,
        maxWidth: 520,
        maxHeight: `${maxHeightRatio * 100}%` as const,
        borderRadius: theme.radii.xl,
        paddingBottom: theme.space.lg,
      }
    : {
        position: 'absolute' as const,
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: `${maxHeightRatio * 100}%` as const,
        borderTopLeftRadius: theme.radii.xl,
        borderTopRightRadius: theme.radii.xl,
        paddingBottom: insets.bottom + theme.space.lg,
      };

  const panel = (
    <Animated.View
      accessibilityViewIsModal
      style={{
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
        ...panelStyle,
        opacity: asDialog ? slide : 1,
        transform: [
          {
            translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }),
          },
        ],
        ...theme.elevation(3),
      }}
    >
      {/* The grab handle is a drag affordance, and there is nothing to drag with
          a mouse — so it appears only in the bottom-sheet shape. */}
      {asDialog ? null : (
        <View style={{ alignItems: 'center', paddingTop: theme.space.md }}>
          <View
            accessibilityElementsHidden
            style={{
              width: 44,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.colors.borderStrong,
            }}
          />
        </View>
      )}

      <Row
        justify="space-between"
        align="flex-start"
        style={{
          paddingHorizontal: theme.layout.screenPadding,
          paddingTop: asDialog ? theme.space.xl : theme.space.lg,
          paddingBottom: theme.space.md,
          gap: theme.space.lg,
        }}
      >
        <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <IconButton icon="close" label="Close" variant="ghost" size={40} onPress={onClose} />
      </Row>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.layout.screenPadding,
          paddingBottom: theme.space.lg,
          gap: theme.space.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{ ...theme.layout.fill, opacity: slide, backgroundColor: theme.colors.scrim }}
      >
        <Pressable
          style={theme.layout.fill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>

      {asDialog ? (
        // A non-interactive centring layer: `pointerEvents="box-none"` lets clicks
        // outside the panel fall through to the scrim above, so click-away still
        // dismisses.
        <View
          pointerEvents="box-none"
          style={{
            ...theme.layout.fill,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            padding: breakpoint.gutter,
          }}
        >
          {panel}
        </View>
      ) : (
        panel
      )}
    </Modal>
  );
}
