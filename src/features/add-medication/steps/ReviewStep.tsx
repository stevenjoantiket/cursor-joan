/**
 * Step 4 — review.
 *
 * A confirmation screen earns its place here because getting a medication
 * schedule wrong has real consequences. Everything is restated in plain language,
 * including what the reminders will actually do, and each block links back to the
 * step that owns it.
 */
import React from 'react';
import { View } from 'react-native';
import {
  Badge,
  Card,
  Chip,
  Divider,
  Icon,
  InlineNotice,
  ListRow,
  PillShape,
  Row,
  Section,
  Text,
  useTheme,
} from '@ds';
import { describeSchedule } from '../../../domain/schedule';
import { instructionTagById } from '../../../domain/instructions';
import { daysOfStockRemaining } from '../../../domain/inventory';
import { daysBetween, formatClockTime, formatLongDate } from '../../../utils/date';
import type { AddStep, MedicationDraft } from '../useMedicationDraft';

export function ReviewStep({
  draft,
  dailyTimes,
  resolvedDuration,
  notificationsEnabled,
  onEditStep,
  onRequestNotifications,
}: {
  draft: MedicationDraft;
  dailyTimes: string[];
  resolvedDuration: { startDate: string; endDate: string | null };
  notificationsEnabled: boolean;
  onEditStep: (step: AddStep) => void;
  onRequestNotifications: () => void;
}) {
  const theme = useTheme();

  const tags = draft.instructionTags
    .map((id) => instructionTagById(id))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

  const courseLength =
    resolvedDuration.endDate === null
      ? null
      : daysBetween(resolvedDuration.startDate, resolvedDuration.endDate) + 1;

  const stockDays = draft.trackInventory
    ? daysOfStockRemaining({
        schedule: draft.schedule,
        dosageAmount: Number(draft.dosageAmount) || 1,
        dosageUnit: draft.dosageUnit,
        inventoryCount: Number(draft.inventoryCount) || 0,
      })
    : null;

  return (
    <View style={{ gap: theme.space.xxl }}>
      <Card>
        <Row gap="lg">
          <PillShape form={draft.form} ink={draft.ink} size={72} />
          <View style={{ ...theme.layout.fill, gap: theme.space.xs }}>
            <Text variant="heading" numberOfLines={2}>
              {draft.name.trim()}
            </Text>
            <Text variant="body" tone="secondary">
              {formatAmount(draft.dosageAmount)} {draft.dosageUnit}
              {draft.strength ? ` · ${draft.strength}` : ''}
            </Text>
            {tags.length > 0 ? (
              <Row gap="xs" wrap style={{ marginTop: theme.space.xs }}>
                {tags.map((tag) => (
                  <Chip key={tag.id} label={tag.label} icon={tag.icon} size="sm" showSelectionMark={false} />
                ))}
              </Row>
            ) : null}
          </View>
        </Row>
      </Card>

      <Section title="Schedule" action={<Chip label="Edit" size="sm" showSelectionMark={false} onPress={() => onEditStep('schedule')} />}>
        <Card outlined elevated={0} padding="lg">
          <View style={{ gap: theme.space.md }}>
            <ListRow
              leading={<Icon name="clock" size={20} tone="brand" />}
              title={describeSchedule(draft.schedule)}
              subtitle={dailyTimes.map((time) => formatClockTime(time)).join(' · ')}
            />
            <Divider />
            <ListRow
              leading={<Icon name="calendar" size={20} tone="brand" />}
              title={
                resolvedDuration.endDate === null
                  ? 'Ongoing — no end date'
                  : `${courseLength} ${courseLength === 1 ? 'day' : 'days'}`
              }
              subtitle={
                resolvedDuration.endDate === null
                  ? `From ${formatLongDate(resolvedDuration.startDate)}`
                  : `${formatLongDate(resolvedDuration.startDate)} → ${formatLongDate(resolvedDuration.endDate)}`
              }
              trailing={
                resolvedDuration.endDate !== null ? (
                  <Badge label="Auto-archives" icon="archive" />
                ) : undefined
              }
            />
            {draft.trackInventory ? (
              <>
                <Divider />
                <ListRow
                  leading={<Icon name="package" size={20} tone="brand" />}
                  title={`${draft.inventoryCount} in stock`}
                  subtitle={
                    stockDays !== null
                      ? `About ${stockDays} ${stockDays === 1 ? 'day' : 'days'} of doses · warning at ${draft.refillThreshold} left`
                      : `Warning at ${draft.refillThreshold} left`
                  }
                />
              </>
            ) : null}
          </View>
        </Card>
      </Section>

      <Section title="Details" action={<Chip label="Edit" size="sm" showSelectionMark={false} onPress={() => onEditStep('identity')} />}>
        <Card outlined elevated={0} padding="lg">
          <View style={{ gap: theme.space.md }}>
            <ListRow
              leading={<PillShape form={draft.form} ink={draft.ink} size={28} />}
              title="Appearance"
              subtitle="How it looks on your timeline"
            />
            {draft.notes.trim() ? (
              <>
                <Divider />
                <ListRow
                  leading={<Icon name="info" size={20} tone="secondary" />}
                  title="Your note"
                  subtitle={draft.notes.trim()}
                />
              </>
            ) : null}
          </View>
        </Card>
      </Section>

      {notificationsEnabled ? (
        <InlineNotice
          tone="success"
          icon="bell"
          title={`${dailyTimes.length} reminder${dailyTimes.length === 1 ? '' : 's'} a day`}
          message="We will notify you at each dose time, even when the app is closed."
        />
      ) : (
        <InlineNotice
          tone="warning"
          icon="bellOff"
          title="Reminders are off"
          message="Without notification permission, med+capsule can still track your doses but cannot remind you when one is due."
          actionLabel="Turn on reminders"
          onAction={onRequestNotifications}
        />
      )}
    </View>
  );
}

function formatAmount(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}
