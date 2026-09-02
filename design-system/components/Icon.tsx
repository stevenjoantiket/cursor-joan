/**
 * <Icon> — the app's complete icon set, drawn as SVG paths so there is no icon
 * font to load and every glyph inherits the theme's colours.
 *
 * All glyphs live on a 24x24 grid with a 2px round-capped stroke, so they sit
 * optically level next to one another at any size.
 */
import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { decorative, meaningful, useTheme } from '../theme';

export type IconName =
  | 'check'
  | 'checkCircle'
  | 'close'
  | 'closeCircle'
  | 'clock'
  | 'snooze'
  | 'plus'
  | 'minus'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'arrowRight'
  | 'calendar'
  | 'bell'
  | 'bellOff'
  | 'archive'
  | 'trash'
  | 'edit'
  | 'home'
  | 'activity'
  | 'droplet'
  | 'glass'
  | 'bowl'
  | 'bowlOff'
  | 'sunrise'
  | 'sun'
  | 'moon'
  | 'alert'
  | 'info'
  | 'package'
  | 'refresh'
  | 'skipForward'
  | 'search'
  | 'sliders'
  | 'capsule'
  | 'syringe'
  | 'dots';

export type IconTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger';

export type IconProps = {
  name: IconName;
  /** Square edge length in points. Defaults to 24 — the design grid size. */
  size?: number;
  tone?: IconTone;
  /** Escape hatch for painting an icon in a medicine swatch colour. */
  color?: string;
  strokeWidth?: number;
  /** Set when the icon carries meaning no adjacent text already conveys. */
  accessibilityLabel?: string;
};

const glyphs: Record<IconName, React.ReactNode> = {
  check: <Path d="M20 6.5 9.2 17.3 4 12.1" />,
  checkCircle: (
    <G>
      <Path d="M21.8 11.1V12a9.8 9.8 0 1 1-5.8-9" />
      <Path d="M22 4.4 12 14.4l-3-3" />
    </G>
  ),
  close: (
    <G>
      <Path d="M18 6 6 18" />
      <Path d="M6 6l12 12" />
    </G>
  ),
  closeCircle: (
    <G>
      <Circle cx={12} cy={12} r={9.5} />
      <Path d="M15 9l-6 6" />
      <Path d="M9 9l6 6" />
    </G>
  ),
  clock: (
    <G>
      <Circle cx={12} cy={12} r={9.5} />
      <Path d="M12 6.6V12l3.6 2.2" />
    </G>
  ),
  // "Zz" — reads as snooze without needing a colour or a caption.
  snooze: (
    <G>
      <Path d="M4 6.5h7.5L4 15h7.5" />
      <Path d="M14.5 13.5H21l-6.5 7H21" />
    </G>
  ),
  plus: (
    <G>
      <Path d="M12 5v14" />
      <Path d="M5 12h14" />
    </G>
  ),
  minus: <Path d="M5 12h14" />,
  chevronLeft: <Path d="M15 18.5 8.5 12 15 5.5" />,
  chevronRight: <Path d="M9 5.5 15.5 12 9 18.5" />,
  chevronDown: <Path d="M5.5 9 12 15.5 18.5 9" />,
  arrowRight: (
    <G>
      <Path d="M4 12h15" />
      <Path d="M13 6l6 6-6 6" />
    </G>
  ),
  calendar: (
    <G>
      <Rect x={3} y={4.5} width={18} height={17} rx={3} />
      <Path d="M8 2.5v4" />
      <Path d="M16 2.5v4" />
      <Path d="M3 10h18" />
    </G>
  ),
  bell: (
    <G>
      <Path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.6 8.5-2.6 8.5h17.2S18 15 18 8.5" />
      <Path d="M13.7 20.8a2 2 0 0 1-3.4 0" />
    </G>
  ),
  bellOff: (
    <G>
      <Path d="M13.7 20.8a2 2 0 0 1-3.4 0" />
      <Path d="M17.9 12.5c.1-1.3.1-2.7.1-4a6 6 0 0 0-9.3-5" />
      <Path d="M6.2 6.2A6 6 0 0 0 6 8.5c0 6.5-2.6 8.5-2.6 8.5h13.1" />
      <Path d="M2.5 2.5l19 19" />
    </G>
  ),
  archive: (
    <G>
      <Path d="M20.5 8.5V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V8.5" />
      <Rect x={2} y={3} width={20} height={5.5} rx={1.6} />
      <Path d="M10 12.5h4" />
    </G>
  ),
  trash: (
    <G>
      <Path d="M3.5 6.5h17" />
      <Path d="M18.5 6.5 17.6 20a1.5 1.5 0 0 1-1.5 1.4H7.9A1.5 1.5 0 0 1 6.4 20L5.5 6.5" />
      <Path d="M9.5 6.5V4.6A1.6 1.6 0 0 1 11.1 3h1.8a1.6 1.6 0 0 1 1.6 1.6v1.9" />
      <Path d="M10.5 11v6" />
      <Path d="M13.5 11v6" />
    </G>
  ),
  edit: (
    <G>
      <Path d="M12.5 20.5H21" />
      <Path d="M16.6 3.4a2.2 2.2 0 0 1 3 3L7.2 18.9 3 20l1.1-4.2z" />
    </G>
  ),
  home: (
    <G>
      <Path d="M3.5 9.5 12 3l8.5 6.5V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20z" />
      <Path d="M9.5 21.5v-8h5v8" />
    </G>
  ),
  activity: <Path d="M22 12h-4.2l-2.8 8.5L9 3.5 6.2 12H2" />,
  droplet: <Path d="M12 2.9l5.5 5.5a7.8 7.8 0 1 1-11 0z" />,
  glass: (
    <G>
      <Path d="M6 3h12l-1.4 16.6A2 2 0 0 1 14.6 21.5H9.4a2 2 0 0 1-2-1.9L6 3z" />
      <Path d="M5.6 9.5h12.8" />
    </G>
  ),
  bowl: (
    <G>
      <Path d="M3 12h18a9 9 0 0 1-18 0z" />
      <Path d="M9 4.5v3" />
      <Path d="M12 3v4.5" />
      <Path d="M15 4.5v3" />
    </G>
  ),
  bowlOff: (
    <G>
      <Path d="M3 12h18a9 9 0 0 1-18 0z" />
      <Path d="M12 3v4.5" />
      <Path d="M3 21.5 21 3.5" />
    </G>
  ),
  sunrise: (
    <G>
      <Path d="M7 17.5a5 5 0 0 1 10 0" />
      <Path d="M12 2.5v6" />
      <Path d="M8.5 5.5 12 2.5l3.5 3" />
      <Path d="M4 10.5l1.4 1.4" />
      <Path d="M18.6 11.9 20 10.5" />
      <Path d="M2 21.5h20" />
      <Path d="M2 17.5h2.5" />
      <Path d="M19.5 17.5H22" />
    </G>
  ),
  sun: (
    <G>
      <Circle cx={12} cy={12} r={4.6} />
      <Path d="M12 1.8v2.4" />
      <Path d="M12 19.8v2.4" />
      <Path d="M4.8 4.8l1.7 1.7" />
      <Path d="M17.5 17.5l1.7 1.7" />
      <Path d="M1.8 12h2.4" />
      <Path d="M19.8 12h2.4" />
      <Path d="M4.8 19.2l1.7-1.7" />
      <Path d="M17.5 6.5l1.7-1.7" />
    </G>
  ),
  moon: <Path d="M21 12.9A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.9z" />,
  alert: (
    <G>
      <Path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <Path d="M12 9v4.2" />
      <Path d="M12 17h.01" />
    </G>
  ),
  info: (
    <G>
      <Circle cx={12} cy={12} r={9.5} />
      <Path d="M12 16.5V11.5" />
      <Path d="M12 8h.01" />
    </G>
  ),
  package: (
    <G>
      <Path d="M20.5 16.2V7.8a1.8 1.8 0 0 0-.9-1.6l-6.7-3.9a1.8 1.8 0 0 0-1.8 0L4.4 6.2a1.8 1.8 0 0 0-.9 1.6v8.4a1.8 1.8 0 0 0 .9 1.6l6.7 3.9a1.8 1.8 0 0 0 1.8 0l6.7-3.9a1.8 1.8 0 0 0 .9-1.6z" />
      <Path d="M3.8 7 12 11.8 20.2 7" />
      <Path d="M12 21.6V11.8" />
      <Path d="M16.2 9.3 7.9 4.5" />
    </G>
  ),
  refresh: (
    <G>
      <Path d="M21.5 4.5v5.6h-5.6" />
      <Path d="M2.5 19.5v-5.6h5.6" />
      <Path d="M3.6 9.4A8.5 8.5 0 0 1 17.6 6l3.9 3.6" />
      <Path d="M20.4 14.6A8.5 8.5 0 0 1 6.4 18L2.5 14.4" />
    </G>
  ),
  skipForward: (
    <G>
      <Path d="M5 4.5l10 7.5-10 7.5z" />
      <Path d="M19 5v14" />
    </G>
  ),
  search: (
    <G>
      <Circle cx={10.8} cy={10.8} r={7.8} />
      <Path d="M21 21l-4.7-4.7" />
    </G>
  ),
  sliders: (
    <G>
      <Path d="M5 21v-6.5" />
      <Path d="M5 10.5V3" />
      <Path d="M12 21v-9" />
      <Path d="M12 8V3" />
      <Path d="M19 21v-4.5" />
      <Path d="M19 12.5V3" />
      <Path d="M2 14.5h6" />
      <Path d="M9 8h6" />
      <Path d="M16 16.5h6" />
    </G>
  ),
  // A capsule on the diagonal — the app's own mark.
  capsule: (
    <G>
      <Rect x={1.5} y={8} width={21} height={8} rx={4} transform="rotate(-45 12 12)" />
      <Path d="M9.2 9.2 14.8 14.8" />
    </G>
  ),
  syringe: (
    <G>
      <Path d="M17.5 2.5 21.5 6.5" />
      <Path d="M19.5 4.5 13 11" />
      <Path d="M15.5 8.5 8 16l-3 .6L4.4 19.6 2.5 21.5" />
      <Path d="M11 5l8 8" />
      <Path d="M8.8 12.2 11.8 15.2" />
    </G>
  ),
  dots: (
    <G>
      <Circle cx={5} cy={12} r={1.6} />
      <Circle cx={12} cy={12} r={1.6} />
      <Circle cx={19} cy={12} r={1.6} />
    </G>
  ),
};

export function Icon({
  name,
  size = 24,
  tone = 'primary',
  color,
  strokeWidth = 2,
  accessibilityLabel,
}: IconProps) {
  const theme = useTheme();

  const toneColor: Record<IconTone, string> = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    inverse: theme.colors.textInverse,
    brand: theme.colors.brand,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  };

  const stroke = color ?? toneColor[tone];
  // The 24-unit viewBox is scaled to `size`, so the stroke has to be divided by
  // that same factor to stay a constant thickness in points at any icon size.
  const scaledStroke = (strokeWidth * 24) / size;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      {...(accessibilityLabel ? meaningful : decorative)}
    >
      <G
        fill="none"
        stroke={stroke}
        strokeWidth={scaledStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {glyphs[name]}
      </G>
    </Svg>
  );
}
