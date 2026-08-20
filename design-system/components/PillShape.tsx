/**
 * <PillShape> — draws a medicine to look like the thing in the user's hand.
 *
 * This is the app's central visual device: the pairing of a *shape* and a
 * *colour* is what lets someone confirm "yes, that's the right tablet" at a
 * glance, without reading. Because it renders from vector paths it stays crisp
 * at 24pt in a list row and at 96pt on a detail screen.
 *
 * Every form carries its own outline and a lighter interior detail (score line,
 * meniscus, plunger) so a white tablet on a white card is still legible, and so
 * two medicines of the same colour remain distinguishable by form alone.
 */
import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme';
import { medicineInk, type MedicineInkName } from '../tokens';

/** The physical forms a user can pick from during onboarding. */
export type MedicineForm =
  | 'round'
  | 'oval'
  | 'capsule'
  | 'triangle'
  | 'tablet'
  | 'drops'
  | 'syrup'
  | 'injection'
  | 'inhaler'
  | 'sachet';

export const medicineForms: {
  form: MedicineForm;
  label: string;
  /** Read aloud by screen readers and used in the confirmation summary. */
  description: string;
}[] = [
  { form: 'round', label: 'Round pill', description: 'A round tablet' },
  { form: 'oval', label: 'Oval pill', description: 'An oval tablet' },
  { form: 'capsule', label: 'Capsule', description: 'A two-tone capsule' },
  { form: 'tablet', label: 'Caplet', description: 'A rounded rectangular caplet' },
  { form: 'triangle', label: 'Triangle', description: 'A triangular tablet' },
  { form: 'drops', label: 'Drops', description: 'Liquid drops' },
  { form: 'syrup', label: 'Syrup', description: 'A bottle of syrup' },
  { form: 'injection', label: 'Injection', description: 'An injection' },
  { form: 'inhaler', label: 'Inhaler', description: 'An inhaler' },
  { form: 'sachet', label: 'Sachet', description: 'A powder sachet' },
];

export type PillShapeProps = {
  form: MedicineForm;
  ink: MedicineInkName;
  /** Rendered edge length in points. The artwork is drawn on a 48x48 grid. */
  size?: number;
  /**
   * Dims the shape and drops the highlight — used for doses already logged and
   * for archived medications, so state is legible without relying on colour.
   */
  muted?: boolean;
  accessibilityLabel?: string;
};

const GRID = 48;

export function PillShape({
  form,
  ink,
  size = 44,
  muted = false,
  accessibilityLabel,
}: PillShapeProps) {
  const theme = useTheme();
  const swatch = medicineInk[ink] ?? medicineInk.white;

  const fill = swatch.fill;
  const edge = swatch.edge;
  const speck = swatch.speck;
  const stroke = (1.6 * GRID) / size;
  const gradientId = `pill-gloss-${form}-${ink}`;

  const body = (() => {
    switch (form) {
      case 'round':
        return (
          <G>
            <Circle cx={24} cy={24} r={17} fill={fill} stroke={edge} strokeWidth={stroke} />
            {/* Score line — how a real tablet is split in half. */}
            <Path d="M24 9.5v29" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
          </G>
        );

      case 'oval':
        return (
          <G>
            <Ellipse cx={24} cy={24} rx={20} ry={12.5} fill={fill} stroke={edge} strokeWidth={stroke} />
            <Path d="M24 13.5v21" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
          </G>
        );

      case 'capsule':
        // Two halves on the diagonal: a darker cap over a lighter body, which is
        // how most real capsules are printed.
        return (
          <G transform="rotate(-38 24 24)">
            <Rect x={3} y={17} width={42} height={14} rx={7} fill={fill} stroke={edge} strokeWidth={stroke} />
            <Path
              d="M10 17h14v14H10a7 7 0 0 1-7-7 7 7 0 0 1 7-7z"
              fill={edge}
              opacity={0.9}
            />
            <Rect x={3} y={17} width={42} height={14} rx={7} fill="none" stroke={edge} strokeWidth={stroke} />
            <Path d="M24 17v14" stroke={fill} strokeWidth={stroke} opacity={0.6} />
          </G>
        );

      case 'tablet':
        return (
          <G>
            <Rect x={5} y={15} width={38} height={18} rx={9} fill={fill} stroke={edge} strokeWidth={stroke} />
            <Path d="M24 16.5v15" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
          </G>
        );

      case 'triangle':
        return (
          <G>
            <Path
              d="M24 7.5 42 37a3.5 3.5 0 0 1-3 5.2H9a3.5 3.5 0 0 1-3-5.2z"
              fill={fill}
              stroke={edge}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <Path d="M24 20v14" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
          </G>
        );

      case 'drops':
        // A dropper releasing one drop — the drop itself carries the colour.
        return (
          <G>
            <Path
              d="M20 4h8v11a4 4 0 0 1-1.4 3l-1.2 1v4h-3.8v-4l-1.2-1A4 4 0 0 1 20 15z"
              fill={theme.colors.surfaceMuted}
              stroke={edge}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <Path
              d="M24 27.5c4.6 5 7 8.4 7 11.2A7 7 0 0 1 17 38.7c0-2.8 2.4-6.2 7-11.2z"
              fill={fill}
              stroke={edge}
              strokeWidth={stroke}
            />
            <Path d="M21.5 37.5a3 3 0 0 1 2-3.5" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
          </G>
        );

      case 'syrup':
        // Bottle with a fill line, so a dose of liquid reads as a volume.
        return (
          <G>
            <Path d="M19 4h10v6h-10z" fill={edge} />
            <Path
              d="M17 12a4 4 0 0 1 2.6-3.7V10h8.8V8.3A4 4 0 0 1 31 12v27a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4z"
              fill={theme.colors.surface}
              stroke={edge}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <Path d="M17 24h14v15a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4z" fill={fill} />
            <Path d="M17 24h14" stroke={edge} strokeWidth={stroke} />
            <Path
              d="M17 12a4 4 0 0 1 2.6-3.7V10h8.8V8.3A4 4 0 0 1 31 12v27a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4z"
              fill="none"
              stroke={edge}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
          </G>
        );

      case 'injection':
        return (
          <G transform="rotate(-40 24 24)">
            <Path d="M24 2v7" stroke={edge} strokeWidth={stroke * 1.4} strokeLinecap="round" />
            <Rect x={16} y={9} width={16} height={26} rx={3} fill={fill} stroke={edge} strokeWidth={stroke} />
            <Path d="M16 18h16" stroke={speck} strokeWidth={stroke} />
            <Path d="M16 24h16" stroke={speck} strokeWidth={stroke} />
            <Rect x={13} y={35} width={22} height={5} rx={2.5} fill={edge} />
            <Path d="M24 40v6" stroke={edge} strokeWidth={stroke * 1.4} strokeLinecap="round" />
          </G>
        );

      case 'inhaler':
        return (
          <G>
            <Rect x={14} y={14} width={20} height={28} rx={5} fill={fill} stroke={edge} strokeWidth={stroke} />
            <Rect x={19} y={5} width={10} height={10} rx={3} fill={edge} />
            <Path d="M19 24h10" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
            <Path d="M19 31h10" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
          </G>
        );

      case 'sachet':
        return (
          <G>
            <Path
              d="M11 9h26v30H11z"
              fill={fill}
              stroke={edge}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            {/* Serrated top edge — the tear strip. */}
            <Path
              d="M11 9l3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3 3 3 3-3"
              fill="none"
              stroke={edge}
              strokeWidth={stroke}
              strokeLinejoin="round"
            />
            <Path d="M17 22h14" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
            <Path d="M17 28h9" stroke={speck} strokeWidth={stroke} strokeLinecap="round" />
          </G>
        );

      default:
        return <Circle cx={24} cy={24} r={17} fill={fill} stroke={edge} strokeWidth={stroke} />;
    }
  })();

  const label =
    accessibilityLabel ??
    `${medicineInk[ink]?.label ?? 'White'} ${
      medicineForms.find((f) => f.form === form)?.label.toLowerCase() ?? 'pill'
    }`;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      opacity={muted ? 0.45 : 1}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {body}
      {/* A single soft gloss over the whole form ties the set together. */}
      {!muted ? <Circle cx={24} cy={24} r={23} fill={`url(#${gradientId})`} /> : null}
    </Svg>
  );
}
