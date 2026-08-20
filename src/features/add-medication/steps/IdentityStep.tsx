/**
 * Step 1 — name, shape, colour.
 *
 * The shape and colour pickers come before anything numeric on purpose: choosing
 * the artwork that matches the tablet in your hand is the easiest possible first
 * task, and the live preview makes the rest of the form feel concrete.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import {
  Card,
  Input,
  PillShape,
  Row,
  Section,
  SelectableTile,
  SwatchDot,
  Text,
  medicineForms,
  medicineInkNames,
  useTheme,
} from '@ds';
import type { FieldErrors, MedicationDraft } from '../useMedicationDraft';

export function IdentityStep({
  draft,
  errors,
  showErrors,
  update,
}: {
  draft: MedicationDraft;
  errors: FieldErrors;
  showErrors: boolean;
  update: <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space.xxl }}>
      {/* Live preview — what the medication will look like everywhere else. */}
      <Card tone="muted" elevated={0}>
        <Row gap="lg">
          <PillShape form={draft.form} ink={draft.ink} size={64} />
          <View style={{ ...theme.layout.fill, gap: theme.space.xxs }}>
            <Text variant="subheading" numberOfLines={1}>
              {draft.name.trim() || 'Your medication'}
            </Text>
            <Text variant="caption" tone="secondary">
              {medicineForms.find((entry) => entry.form === draft.form)?.label}
              {draft.strength ? ` · ${draft.strength}` : ''}
            </Text>
          </View>
        </Row>
      </Card>

      <Input
        label="Medication name"
        required
        placeholder="e.g. Amoxicillin"
        value={draft.name}
        onChangeText={(value) => update('name', value)}
        error={showErrors ? errors.name : undefined}
        autoCapitalize="sentences"
        autoCorrect={false}
        returnKeyType="next"
        iconLeft="capsule"
      />

      <Input
        label="Strength (optional)"
        placeholder="e.g. 500 mg tablet"
        hint="Copy this from the label if it helps you tell similar boxes apart."
        value={draft.strength}
        onChangeText={(value) => update('strength', value)}
      />

      <Section title="Shape" caption="Pick the form that matches what you take.">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space.md, paddingRight: theme.space.lg }}
          accessibilityRole="radiogroup"
        >
          {medicineForms.map((entry) => (
            <SelectableTile
              key={entry.form}
              selected={draft.form === entry.form}
              onPress={() => update('form', entry.form)}
              label={entry.label}
              accessibilityLabel={entry.description}
              testID={`form-${entry.form}`}
            >
              <PillShape form={entry.form} ink={draft.ink} size={46} />
            </SelectableTile>
          ))}
        </ScrollView>
      </Section>

      <Section title="Colour" caption="Choose the closest match — it makes the dose easy to spot.">
        <Row gap="md" wrap accessibilityRole="radiogroup">
          {medicineInkNames.map((ink) => (
            <SwatchDot
              key={ink}
              ink={ink}
              selected={draft.ink === ink}
              onPress={() => update('ink', ink)}
              testID={`ink-${ink}`}
            />
          ))}
        </Row>
      </Section>
    </View>
  );
}
