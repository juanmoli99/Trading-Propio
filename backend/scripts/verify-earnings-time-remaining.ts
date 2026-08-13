import { EarningsTimeRemainingService } from '../src/market-events/earnings-time-remaining.service';
import type { EarningsCalendarEvent } from '../src/market-events/earnings-calendar.types';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectThrow(name: string, action: () => unknown): void {
  let rejected = false;

  try {
    action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function createEvent(
  overrides: Partial<EarningsCalendarEvent> = {},
): EarningsCalendarEvent {
  return {
    symbol: 'AAPL',
    reportDate: '2026-08-20',
    session: 'POST_MARKET',
    raw: {
      source: 'verification',
    },
    ...overrides,
  };
}

function main(): void {
  const service = new EarningsTimeRemainingService();

  const asOf = new Date('2026-08-18T12:00:00.000Z');

  const event = createEvent();

  const result = service.calculate({
    event,
    asOf,
  });

  check('SYMBOL_PRESERVED', result.symbol === 'AAPL');

  check('REPORT_DATE_PRESERVED', result.reportDate === '2026-08-20');

  check('SESSION_PRESERVED', result.session === 'POST_MARKET');

  check(
    'AS_OF_PRESERVED',
    result.asOf.toISOString() === '2026-08-18T12:00:00.000Z',
  );

  check(
    'REPORT_DATE_START_CORRECT',
    result.reportDateStart.toISOString() === '2026-08-20T00:00:00.000Z',
  );

  check(
    'MILLISECONDS_REMAINING_CORRECT',
    result.millisecondsRemaining === 36 * 60 * 60 * 1000,
  );

  check('HOURS_REMAINING_CORRECT', result.hoursRemaining === 36);

  check('DAYS_REMAINING_CORRECT', result.daysRemaining === 1.5);

  check('CALENDAR_DAYS_REMAINING_CORRECT', result.calendarDaysRemaining === 2);

  check('FUTURE_EVENT_NOT_TODAY', result.isToday === false);

  check('FUTURE_EVENT_NOT_PAST', result.isPast === false);

  const sameDayBeforeMidnight = service.calculate({
    event,
    asOf: new Date('2026-08-20T00:00:00.000Z'),
  });

  check('SAME_DAY_IS_TODAY', sameDayBeforeMidnight.isToday === true);

  check('SAME_DAY_NOT_PAST', sameDayBeforeMidnight.isPast === false);

  check(
    'SAME_DAY_CALENDAR_DAYS_ZERO',
    sameDayBeforeMidnight.calendarDaysRemaining === 0,
  );

  check(
    'EXACT_BOUNDARY_TIME_ZERO',
    sameDayBeforeMidnight.millisecondsRemaining === 0,
  );

  const sameDayLater = service.calculate({
    event,
    asOf: new Date('2026-08-20T18:30:00.000Z'),
  });

  check('LATER_SAME_DAY_STILL_TODAY', sameDayLater.isToday === true);

  check('LATER_SAME_DAY_NOT_CALENDAR_PAST', sameDayLater.isPast === false);

  check(
    'LATER_SAME_DAY_TIME_DELTA_NEGATIVE',
    sameDayLater.millisecondsRemaining < 0,
  );

  check(
    'LATER_SAME_DAY_CALENDAR_DAYS_ZERO',
    sameDayLater.calendarDaysRemaining === 0,
  );

  const past = service.calculate({
    event,
    asOf: new Date('2026-08-21T12:00:00.000Z'),
  });

  check('PAST_EVENT_DETECTED', past.isPast === true);

  check('PAST_EVENT_NOT_TODAY', past.isToday === false);

  check('PAST_CALENDAR_DAYS_CORRECT', past.calendarDaysRemaining === -1);

  check('PAST_HOURS_NEGATIVE', past.hoursRemaining === -36);

  const normalizedSymbol = service.calculate({
    event: createEvent({
      symbol: '  aapl  ',
    }),
    asOf,
  });

  check('SYMBOL_NORMALIZED', normalizedSymbol.symbol === 'AAPL');

  const inputAsOf = new Date('2026-08-18T12:00:00.000Z');

  const defensiveResult = service.calculate({
    event,
    asOf: inputAsOf,
  });

  check('AS_OF_DEFENSIVELY_COPIED', defensiveResult.asOf !== inputAsOf);

  check(
    'REPORT_DATE_START_NEW_INSTANCE',
    defensiveResult.reportDateStart !== inputAsOf,
  );

  const originalAsOfTime = inputAsOf.getTime();

  service.calculate({
    event,
    asOf: inputAsOf,
  });

  check('INPUT_AS_OF_NOT_MUTATED', inputAsOf.getTime() === originalAsOfTime);

  const deterministicInput = {
    event: createEvent(),
    asOf: new Date('2026-08-18T12:00:00.000Z'),
  };

  const first = service.calculate(deterministicInput);

  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.symbol === second.symbol &&
      first.reportDate === second.reportDate &&
      first.session === second.session &&
      first.asOf.getTime() === second.asOf.getTime() &&
      first.reportDateStart.getTime() === second.reportDateStart.getTime() &&
      first.millisecondsRemaining === second.millisecondsRemaining &&
      first.hoursRemaining === second.hoursRemaining &&
      first.daysRemaining === second.daysRemaining &&
      first.calendarDaysRemaining === second.calendarDaysRemaining &&
      first.isToday === second.isToday &&
      first.isPast === second.isPast,
  );

  check(
    'RESULT_NUMBERS_FINITE',
    Number.isFinite(result.millisecondsRemaining) &&
      Number.isFinite(result.hoursRemaining) &&
      Number.isFinite(result.daysRemaining) &&
      Number.isFinite(result.calendarDaysRemaining),
  );

  expectThrow('INVALID_SYMBOL_REJECTED_EMPTY', () =>
    service.calculate({
      event: createEvent({
        symbol: '',
      }),
      asOf,
    }),
  );

  expectThrow('INVALID_SYMBOL_REJECTED_WHITESPACE', () =>
    service.calculate({
      event: createEvent({
        symbol: '   ',
      }),
      asOf,
    }),
  );

  expectThrow('INVALID_SYMBOL_REJECTED_INTERNAL_SPACE', () =>
    service.calculate({
      event: createEvent({
        symbol: 'AA PL',
      }),
      asOf,
    }),
  );

  expectThrow('INVALID_SYMBOL_REJECTED_TOO_LONG', () =>
    service.calculate({
      event: createEvent({
        symbol: 'A'.repeat(33),
      }),
      asOf,
    }),
  );

  expectThrow('INVALID_REPORT_DATE_REJECTED_FORMAT', () =>
    service.calculate({
      event: createEvent({
        reportDate: '20-08-2026',
      }),
      asOf,
    }),
  );

  expectThrow('INVALID_REPORT_DATE_REJECTED_CALENDAR', () =>
    service.calculate({
      event: createEvent({
        reportDate: '2026-02-30',
      }),
      asOf,
    }),
  );

  expectThrow('INVALID_AS_OF_REJECTED', () =>
    service.calculate({
      event,
      asOf: new Date(Number.NaN),
    }),
  );

  expectThrow('INVALID_SESSION_REJECTED', () =>
    service.calculate({
      event: {
        ...event,
        session: 'INVALID' as EarningsCalendarEvent['session'],
      },
      asOf,
    }),
  );

  console.log('PUNTO 234 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
