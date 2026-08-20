/**
 * <SelectableTile> — the square target used by the visual shape picker, and
 * <SwatchDot>, the circular one used by the colour picker.
 *
 * Both are deliberately large (72pt / 52pt) because they are picked by people
 * matching artwork against a real tablet, sometimes without their glasses on.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { medicineInk, type MedicineInkName } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export function SelectableTile({
  selected,
  onPress,
  children,
  label,
  accessibilityLabel,
  size = 76,
  testID,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  /** Caption under the artwork. Kept visible — an icon alone is not enough. */
  label?: string;
  accessibilityLabel?: string;
  size?: number;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({
        width: size,
        alignItems: 'center',
        gap: theme.space.xs,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radii.md,
          backgroundColor: selected ? theme.colors.brandSubtle : theme.colors.surfaceMuted,
          borderWidth: selected ? theme.borderWidth.selected : theme.borderWidth.hairline,
          borderColor: selected ? theme.colors.brand : theme.colors.border,
        }}
      >
        {children}
        {selected ? (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.brand,
              borderWidth: 2,
              borderColor: theme.colors.surface,
            }}
          >
            <Icon name="check" size={13} tone="inverse" strokeWidth={3} />
          </View>
        ) : null}
      </View>
      {label ? (
        <Text
          variant="caption"
          tone={selected ? 'brand' : 'secondary'}
          align="center"
          numberOfLines={2}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** A colour swatch. The check mark is drawn in a contrasting ink for pale fills. */
export function SwatchDot({
  ink,
  selected,
  onPress,
  size = 52,
  testID,
}: {
  ink: MedicineInkName;
  selected: boolean;
  onPress: () => void;
  size?: number;
  testID?: string;
}) {
  const theme = useTheme();
  const swatch = medicineInk[ink];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={theme.hitSlop}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={swatch.label}
      style={({ pressed }) => ({
        alignItems: 'center',
        gap: theme.space.xxs,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          borderWidth: selected ? theme.borderWidth.selected : theme.borderWidth.hairline,
          borderColor: selected ? theme.colors.brand : theme.colors.border,
        }}
      >
        <View
          style={{
            ...theme.layout.fill,
            alignSelf: 'stretch',
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: swatch.fill,
            borderWidth: 1,
            borderColor: swatch.edge,
          }}
        >
          {selected ? <Icon name="check" size={20} color={swatch.edge} strokeWidth={3} /> : null}
        </View>
      </View>
      <Text variant="caption" tone={selected ? 'brand' : 'tertiary'} numberOfLines={1}>
        {swatch.label}
      </Text>
    </Pressable>
  );
}
