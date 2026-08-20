/**
 * design-system/theme/useEscapeKey.ts
 *
 * Calls `onEscape` when the Escape key is pressed, while `active` is true.
 *
 * On a phone, the way out of a sheet is the close button or the scrim — there is
 * no keyboard, and this hook does nothing. In a browser, Escape is what people
 * reach for first, and a dialog that ignores it feels broken. React Native's
 * `Modal.onRequestClose` covers the Android back button but is not a reliable
 * Escape handler on web, so the key is bound here instead.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    if (typeof document === 'undefined') return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape();
      }
    };

    // Capture phase, so the topmost overlay closes before anything below it
    // reacts to the same key press.
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [active, onEscape]);
}
