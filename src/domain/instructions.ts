/**
 * src/domain/instructions.ts
 *
 * The instruction-tag catalogue. Each tag pairs a stable id with an icon from the
 * design system, so a tag reads the same on a picker, a card, and a notification.
 */
import type { IconName } from '@ds';
import type { InstructionTagId } from './types';

export type InstructionTag = {
  id: InstructionTagId;
  label: string;
  icon: IconName;
  /** Appended to the reminder notification body. */
  reminderNote: string;
};

export const instructionTags: InstructionTag[] = [
  { id: 'before-food', label: 'Before food', icon: 'bowlOff', reminderNote: 'Take before eating' },
  { id: 'after-food', label: 'After food', icon: 'bowl', reminderNote: 'Take after eating' },
  { id: 'with-food', label: 'With food', icon: 'bowl', reminderNote: 'Take with a meal' },
  { id: 'empty-stomach', label: 'Empty stomach', icon: 'bowlOff', reminderNote: 'Take on an empty stomach' },
  { id: 'with-water', label: 'With water', icon: 'glass', reminderNote: 'Take with a full glass of water' },
  { id: 'morning', label: 'Morning', icon: 'sunrise', reminderNote: 'Morning dose' },
  { id: 'bedtime', label: 'Bedtime', icon: 'moon', reminderNote: 'Bedtime dose' },
  { id: 'avoid-alcohol', label: 'No alcohol', icon: 'closeCircle', reminderNote: 'Avoid alcohol' },
  { id: 'do-not-crush', label: "Don't crush", icon: 'alert', reminderNote: 'Swallow whole — do not crush' },
];

const byId = new Map(instructionTags.map((tag) => [tag.id, tag]));

export function instructionTagById(id: InstructionTagId): InstructionTag | undefined {
  return byId.get(id);
}

export function describeInstructions(ids: InstructionTagId[]): string {
  return ids
    .map((id) => byId.get(id)?.label)
    .filter((label): label is string => Boolean(label))
    .join(' · ');
}
