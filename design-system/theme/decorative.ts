/**
 * design-system/theme/decorative.ts
 *
 * Props that hide a purely visual element from assistive technology.
 *
 * A timeline rail, a divider, a card's accent stripe and a sheet's grab handle
 * all carry meaning that the surrounding text already states, so a screen reader
 * should skip them rather than announce a shape.
 *
 * The prop names differ by platform, which is the whole reason this exists.
 * React Native uses `accessibilityElementsHidden` (iOS) and
 * `importantForAccessibility` (Android); neither is a DOM attribute, so passing
 * them on the web made React warn once per element that it did not recognise the
 * prop and was forwarding it to the DOM. The web equivalent is `aria-hidden`.
 *
 * Spread it onto the element: `<View {...decorative} style={…} />`.
 */
import { Platform } from 'react-native';
import type { ViewProps } from 'react-native';

export const decorative: ViewProps = Platform.OS === 'web'
  ? // `aria-hidden` is what react-native-web reads; it is not in RN 0.74's
    // ViewProps type, hence the cast.
    ({ 'aria-hidden': true } as unknown as ViewProps)
  : {
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    };

/**
 * The opposite case: an element that assistive technology *should* announce,
 * where Android otherwise needs telling explicitly.
 *
 * On the web an `accessibilityLabel` already becomes `aria-label`, so nothing
 * extra is required — and `importantForAccessibility` would warn there just as it
 * does above.
 */
export const meaningful: ViewProps = Platform.OS === 'web'
  ? {}
  : { importantForAccessibility: 'yes' };
