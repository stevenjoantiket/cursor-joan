/**
 * design-system/theme/useReducedMotion.ts
 *
 * Reports the OS "Reduce Motion" setting.
 *
 * med+capsule animates a fair amount — cards fling away when swiped, sheets slide
 * up, the segmented thumb glides. For a user with vestibular sensitivity those are
 * not decoration, they are a reason to stop using the app. Components consult this
 * hook and fall back to an instant state change, keeping the *outcome* identical
 * and only removing the travel.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduced(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduced(enabled);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return reduced;
}
