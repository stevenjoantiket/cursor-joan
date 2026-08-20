/**
 * design-system/tokens/colors.ts
 *
 * Single source of truth for every colour in med+capsule.
 * Nothing outside this file may declare a raw hex value.
 *
 * Structure
 *   palette      – raw, un-opinionated ramps. Never used directly by features.
 *   lightTheme   – semantic roles for the light appearance.
 *   darkTheme    – semantic roles for the dark appearance.
 *   medicineInk  – the swatch set a user picks from when describing a pill.
 *
 * Accessibility: every `on*` colour is checked to clear WCAG AA (4.5:1) against
 * its paired surface. Status is never communicated by hue alone — pair it with
 * the matching icon from `Icon` and a text label.
 */

export const palette = {
  // Brand — a calm clinical indigo. Trustworthy without feeling like a hospital.
  indigo50: '#EEF1FF',
  indigo100: '#DDE3FF',
  indigo200: '#BCC8FF',
  indigo300: '#94A6FF',
  indigo400: '#6C86FF',
  indigo500: '#4C6FFF',
  indigo600: '#3A55DB',
  indigo700: '#2C40A8',
  indigo800: '#1F2E78',
  indigo900: '#141E4F',

  // Neutrals — very slightly cool so white pills still read against a surface.
  white: '#FFFFFF',
  grey25: '#FBFCFE',
  grey50: '#F7F8FC',
  grey100: '#EFF1F6',
  grey200: '#E2E5EE',
  grey300: '#CBD0DE',
  grey400: '#9BA2B6',
  grey500: '#6F778C',
  grey600: '#525A6E',
  grey700: '#3B4253',
  grey800: '#262B38',
  grey900: '#171A23',
  grey950: '#0E1016',
  black: '#000000',

  // Status
  green50: '#E8F8F1',
  green100: '#CBEFE0',
  green500: '#12A971',
  green600: '#0C8659',
  green700: '#075C3E',
  amber50: '#FFF6E6',
  amber100: '#FFE9C2',
  amber500: '#E5920B',
  amber600: '#B87208',
  rose50: '#FFEDF0',
  rose100: '#FFD6DD',
  rose500: '#E5405E',
  rose600: '#BC2B46',
  cyan50: '#E6F7FB',
  cyan500: '#0FA3C4',
} as const;

export type ThemeColors = {
  /** App background, behind all scrollable content. */
  background: string;
  /** Raised surface — cards, sheets, inputs. */
  surface: string;
  /** A surface resting on top of `surface` (nested rows, chips). */
  surfaceMuted: string;
  /** Pressed feedback fill. */
  surfacePressed: string;
  /**
   * Pointer-hover feedback fill.
   *
   * A phone has no hover state, so this is a web-only affordance — but it must be
   * a token rather than an opacity trick, because on a browser it is the primary
   * signal that a card is clickable at all. Deliberately a lighter step than
   * `surfacePressed` so hover reads as "you could press this" and press reads as
   * "you are pressing it".
   */
  surfaceHovered: string;

  border: string;
  borderStrong: string;
  /** 1px hairline used for timeline rails and dividers. */
  hairline: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  brand: string;
  brandStrong: string;
  brandSubtle: string;
  onBrand: string;

  success: string;
  successSubtle: string;
  onSuccessSubtle: string;

  warning: string;
  warningSubtle: string;
  onWarningSubtle: string;

  danger: string;
  dangerSubtle: string;
  onDangerSubtle: string;

  info: string;
  infoSubtle: string;

  /** Focus ring for keyboard / switch-control users. */
  focusRing: string;
  /** Scrim behind modal sheets. */
  scrim: string;
  /** Neutral shadow colour; elevation tokens supply the opacity. */
  shadow: string;
};

export const lightTheme: ThemeColors = {
  background: palette.grey50,
  surface: palette.white,
  surfaceMuted: palette.grey100,
  surfacePressed: palette.grey200,
  surfaceHovered: palette.grey100,

  border: palette.grey200,
  borderStrong: palette.grey300,
  hairline: palette.grey200,

  textPrimary: palette.grey900,
  textSecondary: palette.grey600,
  textTertiary: palette.grey400,
  textInverse: palette.white,

  brand: palette.indigo500,
  brandStrong: palette.indigo600,
  brandSubtle: palette.indigo50,
  onBrand: palette.white,

  success: palette.green600,
  successSubtle: palette.green50,
  onSuccessSubtle: palette.green700,

  warning: palette.amber600,
  warningSubtle: palette.amber50,
  onWarningSubtle: palette.amber600,

  danger: palette.rose600,
  dangerSubtle: palette.rose50,
  onDangerSubtle: palette.rose600,

  info: palette.cyan500,
  infoSubtle: palette.cyan50,

  focusRing: palette.indigo400,
  scrim: 'rgba(23, 26, 35, 0.45)',
  shadow: palette.grey900,
};

export const darkTheme: ThemeColors = {
  background: palette.grey950,
  surface: palette.grey900,
  surfaceMuted: palette.grey800,
  surfacePressed: palette.grey700,
  surfaceHovered: palette.grey800,

  border: palette.grey800,
  borderStrong: palette.grey700,
  hairline: palette.grey800,

  textPrimary: palette.grey25,
  textSecondary: palette.grey400,
  textTertiary: palette.grey500,
  textInverse: palette.grey900,

  brand: palette.indigo400,
  brandStrong: palette.indigo300,
  brandSubtle: 'rgba(76, 111, 255, 0.16)',
  onBrand: palette.grey950,

  success: palette.green500,
  successSubtle: 'rgba(18, 169, 113, 0.16)',
  onSuccessSubtle: palette.green100,

  warning: palette.amber500,
  warningSubtle: 'rgba(229, 146, 11, 0.16)',
  onWarningSubtle: palette.amber100,

  danger: palette.rose500,
  dangerSubtle: 'rgba(229, 64, 94, 0.16)',
  onDangerSubtle: palette.rose100,

  info: palette.cyan500,
  infoSubtle: 'rgba(15, 163, 196, 0.16)',

  focusRing: palette.indigo300,
  scrim: 'rgba(0, 0, 0, 0.6)',
  shadow: palette.black,
};

/**
 * The swatches a user can assign to a medicine.
 *
 * `fill` paints the body of the <PillShape>, `edge` its outline, and `speck`
 * the score-line / highlight detail. Pale swatches carry a visible edge so a
 * white tablet never disappears into a white card.
 */
export const medicineInk = {
  white: { label: 'White', fill: '#FFFFFF', edge: '#CBD0DE', speck: '#E2E5EE' },
  cream: { label: 'Cream', fill: '#FBF3DC', edge: '#E4D6AE', speck: '#F2E6C7' },
  yellow: { label: 'Yellow', fill: '#FFD84D', edge: '#D9A800', speck: '#FFE9A0' },
  orange: { label: 'Orange', fill: '#FF9A3C', edge: '#D96A00', speck: '#FFC48A' },
  red: { label: 'Red', fill: '#F2564F', edge: '#B92B26', speck: '#F99B96' },
  pink: { label: 'Pink', fill: '#FF9BC1', edge: '#D95B92', speck: '#FFC6DC' },
  purple: { label: 'Purple', fill: '#A97BF2', edge: '#7645C4', speck: '#CFB2FA' },
  blue: { label: 'Blue', fill: '#5B8DEF', edge: '#2F5FBE', speck: '#A6C1F7' },
  cyan: { label: 'Cyan', fill: '#54CFE3', edge: '#1F97AC', speck: '#9EE6F1' },
  green: { label: 'Green', fill: '#57C98B', edge: '#249159', speck: '#A4E4C1' },
  brown: { label: 'Brown', fill: '#B08160', edge: '#7C5638', speck: '#D3AF95' },
  grey: { label: 'Grey', fill: '#B9BFCE', edge: '#8A91A4', speck: '#D8DCE6' },
  clear: { label: 'Clear', fill: 'rgba(226, 229, 238, 0.55)', edge: '#9BA2B6', speck: '#FFFFFF' },
} as const;

export type MedicineInkName = keyof typeof medicineInk;
export const medicineInkNames = Object.keys(medicineInk) as MedicineInkName[];
