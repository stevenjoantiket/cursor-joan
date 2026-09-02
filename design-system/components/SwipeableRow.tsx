/**
 * <SwipeableRow> — swipe a card left or right to commit an action.
 *
 * Built on RN's own Animated + PanResponder so the design system carries no
 * gesture-library dependency. Behaviour notes:
 *   - The action's icon and word are revealed *behind* the card as you drag, so
 *     the outcome is visible before you let go.
 *   - Past `swipeCommitThreshold` the reveal saturates, giving a clear "this
 *     will fire" signal; release before it and the row springs back.
 *   - Vertical intent wins: the responder only claims the gesture once the
 *     horizontal delta clearly exceeds the vertical one, so the list still
 *     scrolls normally.
 *   - Swiping is an accelerator, never the only path. Every row must also expose
 *     the same actions as buttons — see `renderFallbackActions` on the caller.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { Animated, PanResponder, View, type ViewStyle } from 'react-native';
import { decorative, useReducedMotion, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type SwipeAction = {
  label: string;
  icon: IconName;
  /** Background revealed while dragging toward this action. */
  color: string;
  onCommit: () => void;
};

export function SwipeableRow({
  children,
  left,
  right,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  /** Revealed by dragging right (a rightward pull toward "done"). */
  left?: SwipeAction;
  /** Revealed by dragging left. */
  right?: SwipeAction;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const threshold = theme.layout.swipeCommitThreshold;

  const springBack = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: theme.motion.useNativeDriver,
      friction: theme.motion.spring.friction,
      tension: theme.motion.spring.tension,
    }).start();
  }, [translateX, theme.motion.spring.friction, theme.motion.spring.tension]);

  const flingOut = useCallback(
    (direction: 1 | -1, onDone: () => void) => {
      // Reduce Motion commits the action immediately instead of throwing the card
      // off-screen; the gesture and its result are unchanged.
      if (reducedMotion) {
        translateX.setValue(0);
        onDone();
        return;
      }

      Animated.timing(translateX, {
        toValue: direction * 480,
        duration: theme.motion.base,
        useNativeDriver: theme.motion.useNativeDriver,
      }).start(() => {
        onDone();
        // Reset instantly so the row is neutral if it survives in the list.
        translateX.setValue(0);
      });
    },
    [translateX, reducedMotion, theme.motion.base],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) => {
          if (disabled) return false;
          const horizontal = Math.abs(gesture.dx);
          const vertical = Math.abs(gesture.dy);
          // Claim only a clearly horizontal drag, and only toward a defined action.
          if (horizontal < 12 || horizontal < vertical * 1.6) return false;
          return gesture.dx > 0 ? Boolean(left) : Boolean(right);
        },
        onPanResponderMove: (_event, gesture) => {
          const bounded = gesture.dx > 0 ? (left ? gesture.dx : 0) : right ? gesture.dx : 0;
          // Rubber-band past the threshold so the drag feels resistive.
          const overshoot = Math.max(0, Math.abs(bounded) - threshold);
          const eased = Math.sign(bounded) * (Math.abs(bounded) - overshoot * 0.55);
          translateX.setValue(eased);
        },
        onPanResponderRelease: (_event, gesture) => {
          const travelled = Math.abs(gesture.dx);
          const fast = Math.abs(gesture.vx) > 0.6;
          const committed = travelled > threshold || (fast && travelled > threshold * 0.5);

          if (committed && gesture.dx > 0 && left) {
            flingOut(1, left.onCommit);
            return;
          }
          if (committed && gesture.dx < 0 && right) {
            flingOut(-1, right.onCommit);
            return;
          }
          springBack();
        },
        onPanResponderTerminate: springBack,
      }),
    [disabled, left, right, threshold, translateX, flingOut, springBack],
  );

  return (
    <View style={[{ borderRadius: theme.radii.lg, overflow: 'hidden' }, style]}>
      {left ? <RevealPane action={left} side="left" translateX={translateX} threshold={threshold} /> : null}
      {right ? <RevealPane action={right} side="right" translateX={translateX} threshold={threshold} /> : null}

      <Animated.View
        {...responder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function RevealPane({
  action,
  side,
  translateX,
  threshold,
}: {
  action: SwipeAction;
  side: 'left' | 'right';
  translateX: Animated.Value;
  threshold: number;
}) {
  const theme = useTheme();

  // Fades in over the first half of the drag, then holds at full strength.
  const opacity = translateX.interpolate({
    inputRange: side === 'left' ? [0, threshold * 0.5, threshold] : [-threshold, -threshold * 0.5, 0],
    outputRange: side === 'left' ? [0, 0.75, 1] : [1, 0.75, 0],
    extrapolate: 'clamp',
  });

  // The icon nudges inward as the gesture nears commit.
  const iconShift = translateX.interpolate({
    inputRange: side === 'left' ? [0, threshold] : [-threshold, 0],
    outputRange: side === 'left' ? [-12, 0] : [0, 12],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...decorative}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        opacity,
        backgroundColor: action.color,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
        paddingHorizontal: theme.space.xl,
      }}
    >
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
          transform: [{ translateX: iconShift }],
        }}
      >
        <Icon name={action.icon} size={22} tone="inverse" strokeWidth={2.4} />
        <Text variant="label" tone="inverse">
          {action.label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
