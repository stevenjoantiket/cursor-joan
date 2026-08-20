/**
 * Tests for the scheduling engine. These cover the cases that are easy to get
 * wrong and expensive to get wrong: interval expansion, the missed-dose grace
 * window, snooze expiry, and inclusive duration boundaries.
 */
import {
  MISSED_GRACE_MINUTES,
  buildDayTimeline,
  describeSchedule,
  isActiveOn,
  occurrencesFor,
  resolveDailyTimes,
  resolveDoseStatus,
  adherenceForMedication,
} from '../schedule';
import { reactivationDuration, hasCourseEnded, courseProgress } from '../archive';
import { daysOfStockRemaining, decrementStock, stockLevel, unitsPerDose } from '../inventory';
import type { DoseLog, Medication } from '../types';
import { addDays, addMonths, combine, daysBetween } from '../../utils/date';

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med_1',
    name: 'Amoxicillin',
    form: 'capsule',
    ink: 'pink',
    dosageAmount: 1,
    dosageUnit: 'pill',
    instructionTags: [],
    schedule: { mode: 'twice-daily', times: ['09:00', '21:00'] },
    duration: { startDate: '2026-03-01', endDate: '2026-03-07' },
    status: 'active',
    inventoryCount: null,
    refillThreshold: 5,
    createdAt: 0,
    updatedAt: 0,
    archivedAt: null,
    ...overrides,
  };
}

describe('resolveDailyTimes', () => {
  it('sorts and de-duplicates explicit times', () => {
    const times = resolveDailyTimes({ mode: 'custom-times', times: ['21:00', '09:00', '09:00'] });
    expect(times).toEqual(['09:00', '21:00']);
  });

  it('expands an interval that divides the day evenly, wrapping past midnight', () => {
    const times = resolveDailyTimes({ mode: 'interval', times: [], intervalHours: 4, anchorTime: '08:00' });
    expect(times).toEqual(['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']);
  });

  it('truncates an interval that does not divide the day at midnight', () => {
    // Every 5 hours from 08:00 walks back to 03:00 and forward to 23:00 — and
    // never spills a dose onto the wrong calendar day.
    const times = resolveDailyTimes({ mode: 'interval', times: [], intervalHours: 5, anchorTime: '08:00' });
    expect(times).toEqual(['03:00', '08:00', '13:00', '18:00', '23:00']);
    expect(times.every((time) => time >= '00:00' && time <= '23:59')).toBe(true);
  });

  it('collapses an interval of 24 hours or more to a single daily dose', () => {
    expect(resolveDailyTimes({ mode: 'interval', times: [], intervalHours: 24, anchorTime: '07:30' })).toEqual(['07:30']);
    expect(resolveDailyTimes({ mode: 'interval', times: [], intervalHours: 48, anchorTime: '07:30' })).toEqual(['07:30']);
  });

  it('falls back to a single dose for a nonsensical interval', () => {
    expect(resolveDailyTimes({ mode: 'interval', times: [], intervalHours: 0, anchorTime: '08:00' })).toEqual(['08:00']);
  });
});

describe('isActiveOn', () => {
  const medication = makeMedication();

  it('includes both boundary days', () => {
    expect(isActiveOn(medication, '2026-03-01')).toBe(true);
    expect(isActiveOn(medication, '2026-03-07')).toBe(true);
  });

  it('excludes days outside the course', () => {
    expect(isActiveOn(medication, '2026-02-28')).toBe(false);
    expect(isActiveOn(medication, '2026-03-08')).toBe(false);
  });

  it('treats a null end date as open-ended', () => {
    const ongoing = makeMedication({ duration: { startDate: '2026-03-01', endDate: null } });
    expect(isActiveOn(ongoing, '2030-01-01')).toBe(true);
  });

  it('never schedules an archived medication', () => {
    const archived = makeMedication({ status: 'archived' });
    expect(isActiveOn(archived, '2026-03-03')).toBe(false);
  });
});

describe('resolveDoseStatus', () => {
  it('stays pending inside the grace window', () => {
    const scheduled = combine('2026-03-03', '09:00');
    const now = new Date(scheduled.getTime() + (MISSED_GRACE_MINUTES - 1) * 60_000);
    expect(resolveDoseStatus('2026-03-03', '09:00', null, now)).toBe('pending');
  });

  it('becomes missed once the grace window elapses', () => {
    const scheduled = combine('2026-03-03', '09:00');
    const now = new Date(scheduled.getTime() + (MISSED_GRACE_MINUTES + 1) * 60_000);
    expect(resolveDoseStatus('2026-03-03', '09:00', null, now)).toBe('missed');
  });

  it('is pending before it is due', () => {
    const now = combine('2026-03-03', '07:00');
    expect(resolveDoseStatus('2026-03-03', '09:00', null, now)).toBe('pending');
  });

  it('honours a logged outcome regardless of the clock', () => {
    const log: DoseLog = {
      id: 'log_1',
      medicationId: 'med_1',
      date: '2026-03-03',
      scheduledTime: '09:00',
      status: 'taken',
      loggedAt: 0,
      snoozedUntil: null,
    };
    const longAfter = combine('2026-03-05', '09:00');
    expect(resolveDoseStatus('2026-03-03', '09:00', log, longAfter)).toBe('taken');
  });

  it('reports a live snooze as snoozed', () => {
    const now = combine('2026-03-03', '09:30');
    const log: DoseLog = {
      id: 'log_2',
      medicationId: 'med_1',
      date: '2026-03-03',
      scheduledTime: '09:00',
      status: 'snoozed',
      loggedAt: now.getTime(),
      snoozedUntil: now.getTime() + 10 * 60_000,
    };
    expect(resolveDoseStatus('2026-03-03', '09:00', log, now)).toBe('snoozed');
  });

  it('returns an expired snooze to the timing rules rather than leaving it snoozed', () => {
    const scheduled = combine('2026-03-03', '09:00');
    const log: DoseLog = {
      id: 'log_3',
      medicationId: 'med_1',
      date: '2026-03-03',
      scheduledTime: '09:00',
      status: 'snoozed',
      loggedAt: scheduled.getTime(),
      snoozedUntil: scheduled.getTime() + 15 * 60_000,
    };

    // 20 minutes later: snooze over, still inside grace -> pending again.
    const soon = new Date(scheduled.getTime() + 20 * 60_000);
    expect(resolveDoseStatus('2026-03-03', '09:00', log, soon)).toBe('pending');

    // Well past grace -> missed.
    const later = new Date(scheduled.getTime() + (MISSED_GRACE_MINUTES + 30) * 60_000);
    expect(resolveDoseStatus('2026-03-03', '09:00', log, later)).toBe('missed');
  });
});

describe('occurrencesFor', () => {
  it('produces one occurrence per daily time, matched to its log', () => {
    const medication = makeMedication();
    const logs: DoseLog[] = [
      {
        id: 'log_1',
        medicationId: 'med_1',
        date: '2026-03-03',
        scheduledTime: '09:00',
        status: 'taken',
        loggedAt: 0,
        snoozedUntil: null,
      },
    ];

    const doses = occurrencesFor(medication, '2026-03-03', logs, combine('2026-03-03', '12:00'));
    expect(doses).toHaveLength(2);
    expect(doses[0]?.status).toBe('taken');
    expect(doses[1]?.status).toBe('pending');
    expect(doses[0]?.key).toBe('med_1|2026-03-03|09:00');
  });

  it('ignores logs belonging to another day or another medication', () => {
    const medication = makeMedication();
    const logs: DoseLog[] = [
      { id: 'a', medicationId: 'med_1', date: '2026-03-02', scheduledTime: '09:00', status: 'taken', loggedAt: 0, snoozedUntil: null },
      { id: 'b', medicationId: 'med_2', date: '2026-03-03', scheduledTime: '09:00', status: 'taken', loggedAt: 0, snoozedUntil: null },
    ];
    const doses = occurrencesFor(medication, '2026-03-03', logs, combine('2026-03-03', '08:00'));
    expect(doses.every((dose) => dose.log === null)).toBe(true);
  });

  it('returns nothing outside the course', () => {
    expect(occurrencesFor(makeMedication(), '2026-03-09', [])).toEqual([]);
  });
});

describe('buildDayTimeline', () => {
  it('orders by time, then by medication name for a tie', () => {
    const a = makeMedication({ id: 'a', name: 'Zinc', schedule: { mode: 'once-daily', times: ['09:00'] } });
    const b = makeMedication({ id: 'b', name: 'Aspirin', schedule: { mode: 'once-daily', times: ['09:00'] } });
    const c = makeMedication({ id: 'c', name: 'Codeine', schedule: { mode: 'once-daily', times: ['07:00'] } });

    const timeline = buildDayTimeline([a, b, c], '2026-03-03', [], combine('2026-03-03', '06:00'));
    expect(timeline.map((dose) => dose.medication.name)).toEqual(['Codeine', 'Aspirin', 'Zinc']);
  });
});

describe('adherenceForMedication', () => {
  it('rates only resolved doses and never counts future days', () => {
    const medication = makeMedication({ duration: { startDate: '2026-03-01', endDate: '2026-03-02' } });
    const logs: DoseLog[] = [
      { id: '1', medicationId: 'med_1', date: '2026-03-01', scheduledTime: '09:00', status: 'taken', loggedAt: 0, snoozedUntil: null },
      { id: '2', medicationId: 'med_1', date: '2026-03-01', scheduledTime: '21:00', status: 'taken', loggedAt: 0, snoozedUntil: null },
      { id: '3', medicationId: 'med_1', date: '2026-03-02', scheduledTime: '09:00', status: 'skipped', loggedAt: 0, snoozedUntil: null },
    ];

    // Late on the final day: the 21:00 dose is past grace, so it counts as missed.
    const now = combine('2026-03-02', '23:30');
    const summary = adherenceForMedication(medication, logs, now);

    expect(summary.taken).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.missed).toBe(1);
    expect(summary.rate).toBeCloseTo(2 / 4);
  });

  it('is zero, not NaN, when nothing has been resolved yet', () => {
    const medication = makeMedication({ duration: { startDate: '2026-03-01', endDate: '2026-03-07' } });
    const summary = adherenceForMedication(medication, [], combine('2026-03-01', '08:00'));
    expect(summary.rate).toBe(0);
    expect(summary.pending).toBeGreaterThan(0);
  });
});

describe('describeSchedule', () => {
  it('names the common frequencies', () => {
    expect(describeSchedule({ mode: 'once-daily', times: ['09:00'] })).toBe('Once a day at 9:00 AM');
    expect(describeSchedule({ mode: 'twice-daily', times: ['09:00', '21:00'] })).toBe(
      'Twice a day at 9:00 AM and 9:00 PM',
    );
  });

  it('describes an interval by its interval, not its expansion', () => {
    expect(describeSchedule({ mode: 'interval', times: [], intervalHours: 4, anchorTime: '08:00' })).toBe(
      'Every 4 hours · 6× a day',
    );
  });
});

describe('archive rules', () => {
  it('does not archive on the final day, only after it', () => {
    const medication = makeMedication({ duration: { startDate: '2026-03-01', endDate: '2026-03-07' } });
    expect(hasCourseEnded(medication, '2026-03-07')).toBe(false);
    expect(hasCourseEnded(medication, '2026-03-08')).toBe(true);
  });

  it('never archives an open-ended course', () => {
    const ongoing = makeMedication({ duration: { startDate: '2026-03-01', endDate: null } });
    expect(hasCourseEnded(ongoing, '2099-01-01')).toBe(false);
  });

  it('reactivates with the original length, starting today', () => {
    const medication = makeMedication({ duration: { startDate: '2026-03-01', endDate: '2026-03-07' } });
    const revived = reactivationDuration(medication, '2026-06-10');
    expect(revived.startDate).toBe('2026-06-10');
    // 7 inclusive days: 10th through 16th.
    expect(revived.endDate).toBe('2026-06-16');
    expect(daysBetween(revived.startDate, revived.endDate as string) + 1).toBe(7);
  });

  it('keeps an open-ended course open on reactivation', () => {
    const ongoing = makeMedication({ duration: { startDate: '2026-03-01', endDate: null } });
    expect(reactivationDuration(ongoing, '2026-06-10').endDate).toBeNull();
  });

  it('reports course progress inclusively', () => {
    const medication = makeMedication({ duration: { startDate: '2026-03-01', endDate: '2026-03-10' } });
    expect(courseProgress(medication, '2026-03-01')).toBeCloseTo(0.1);
    expect(courseProgress(medication, '2026-03-10')).toBe(1);
    expect(courseProgress(medication, '2026-03-20')).toBe(1);
  });
});

describe('inventory', () => {
  it('consumes the dose amount for countable units and one container unit otherwise', () => {
    expect(unitsPerDose({ dosageAmount: 2, dosageUnit: 'pill' })).toBe(2);
    expect(unitsPerDose({ dosageAmount: 500, dosageUnit: 'mg' })).toBe(1);
  });

  it('never lets a zero dose make stock immortal', () => {
    expect(unitsPerDose({ dosageAmount: 0, dosageUnit: 'pill' })).toBe(1);
  });

  it('projects days of stock from the real dose count', () => {
    const medication = makeMedication({ inventoryCount: 20, dosageAmount: 2, dosageUnit: 'pill' });
    // Twice a day at 2 pills = 4 pills a day.
    expect(daysOfStockRemaining(medication)).toBe(5);
  });

  it('flags low and empty against the threshold', () => {
    expect(stockLevel({ inventoryCount: null, refillThreshold: 5 })).toBe('untracked');
    expect(stockLevel({ inventoryCount: 6, refillThreshold: 5 })).toBe('healthy');
    expect(stockLevel({ inventoryCount: 5, refillThreshold: 5 })).toBe('low');
    expect(stockLevel({ inventoryCount: 0, refillThreshold: 5 })).toBe('empty');
  });

  it('floors a decrement at zero and leaves untracked stock alone', () => {
    expect(decrementStock(makeMedication({ inventoryCount: 1, dosageAmount: 2, dosageUnit: 'pill' }))).toBe(0);
    expect(decrementStock(makeMedication({ inventoryCount: null }))).toBeNull();
  });
});

describe('date helpers', () => {
  it('clamps a month addition rather than spilling into the next month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('adds days across a month boundary', () => {
    expect(addDays('2026-03-30', 3)).toBe('2026-04-02');
  });

  it('measures whole days between calendar dates', () => {
    expect(daysBetween('2026-03-01', '2026-03-08')).toBe(7);
    expect(daysBetween('2026-03-08', '2026-03-01')).toBe(-7);
  });
});
