import type { ConfigService } from '@nestjs/config';
import { EarningsBlackoutAfterService } from '../src/market-events/earnings-blackout-after.service';
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

function createConfigService(blackoutAfterDays: number): ConfigService {
  return {
    get<T = unknown>(key: string): T | undefined {
      if (key === 'earnings.blackoutAfterDays') {
        return blackoutAfterDays as T;
      }

      return undefined;
    },
  } as ConfigService;
}

function createService(
  blackoutAfterDays: number,
): EarningsBlackoutAfterService {
  return new EarningsBlackoutAfterService(
    createConfigService(blackoutAfterDays),
    new EarningsTimeRemainingService(),
  );
}

function createEvent(
  reportDate: string,
  session: EarningsCalendarEvent['session'] = 'POST_MARKET',
): EarningsCalendarEvent {
  return {
    symbol: 'AAPL',
    reportDate,
    session,
    raw: {
      source: 'verification',
    },
  };
}

function main(): void {
  const service = createService(2);

  const before = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check('BEFORE_EVENT_NOT_BLOCKED', before.blocked === false);

  check('BEFORE_EVENT_STATUS_CORRECT', before.status === 'EVENT_NOT_OCCURRED');

  check(
    'BEFORE_EVENT_DAYS_SINCE_NEGATIVE',
    before.calendarDaysSinceEarnings === -1,
  );

  const sameDay = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-20T18:00:00.000Z'),
  });

  check('SAME_DAY_NOT_POST_BLACKOUT', sameDay.blocked === false);

  check(
    'SAME_DAY_STATUS_NOT_OCCURRED',
    sameDay.status === 'EVENT_NOT_OCCURRED',
  );

  check('SAME_DAY_DAYS_SINCE_ZERO', sameDay.calendarDaysSinceEarnings === 0);

  const firstDayAfter = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-21T12:00:00.000Z'),
  });

  check('FIRST_DAY_AFTER_BLOCKED', firstDayAfter.blocked === true);

  check(
    'FIRST_DAY_AFTER_STATUS_CORRECT',
    firstDayAfter.status === 'BLACKED_OUT',
  );

  check(
    'FIRST_DAY_AFTER_DAYS_SINCE_ONE',
    firstDayAfter.calendarDaysSinceEarnings === 1,
  );

  const boundary = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-22T12:00:00.000Z'),
  });

  check('BOUNDARY_DAY_BLOCKED', boundary.blocked === true);

  check('BOUNDARY_STATUS_CORRECT', boundary.status === 'BLACKED_OUT');

  check(
    'BOUNDARY_DAYS_SINCE_CORRECT',
    boundary.calendarDaysSinceEarnings === 2,
  );

  const outside = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-23T12:00:00.000Z'),
  });

  check('OUTSIDE_WINDOW_ALLOWED', outside.blocked === false);

  check('OUTSIDE_WINDOW_STATUS_CORRECT', outside.status === 'ALLOWED');

  check(
    'OUTSIDE_WINDOW_DAYS_SINCE_CORRECT',
    outside.calendarDaysSinceEarnings === 3,
  );

  check('CONFIG_VALUE_PRESERVED', outside.blackoutAfterDays === 2);

  check('ALLOWED_REASON_PRESENT', outside.reason.length > 0);

  const zeroConfig = createService(0);

  const zeroFirstDayAfter = zeroConfig.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-21T12:00:00.000Z'),
  });

  check(
    'ZERO_CONFIG_FIRST_DAY_AFTER_ALLOWED',
    zeroFirstDayAfter.blocked === false,
  );

  check('ZERO_CONFIG_STATUS_ALLOWED', zeroFirstDayAfter.status === 'ALLOWED');

  const preMarket = service.evaluate({
    event: createEvent('2026-08-20', 'PRE_MARKET'),
    asOf: new Date('2026-08-21T12:00:00.000Z'),
  });

  check('SESSION_PRESERVED', preMarket.session === 'PRE_MARKET');

  check('SYMBOL_PRESERVED', preMarket.symbol === 'AAPL');

  check('REPORT_DATE_PRESERVED', preMarket.reportDate === '2026-08-20');

  const asOf = new Date('2026-08-21T12:00:00.000Z');

  const defensive = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf,
  });

  check('AS_OF_PRESERVED', defensive.asOf.getTime() === asOf.getTime());

  check('AS_OF_DEFENSIVELY_COPIED', defensive.asOf !== asOf);

  expectThrow('ASSERT_REJECTS_BLACKED_OUT', () =>
    service.assertEntryAllowed({
      event: createEvent('2026-08-20'),
      asOf: new Date('2026-08-21T12:00:00.000Z'),
    }),
  );

  const assertedBefore = service.assertEntryAllowed({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check(
    'ASSERT_BEFORE_EVENT_PASSES',
    assertedBefore.blocked === false &&
      assertedBefore.status === 'EVENT_NOT_OCCURRED',
  );

  const assertedOutside = service.assertEntryAllowed({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-23T12:00:00.000Z'),
  });

  check(
    'ASSERT_OUTSIDE_WINDOW_PASSES',
    assertedOutside.blocked === false && assertedOutside.status === 'ALLOWED',
  );

  for (const invalid of [
    -1,
    1.5,
    366,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_CONFIG_REJECTED_${String(invalid)}`, () =>
      createService(invalid),
    );
  }

  const deterministicInput = {
    event: createEvent('2026-08-20', 'POST_MARKET'),
    asOf: new Date('2026-08-21T12:00:00.000Z'),
  };

  const first = service.evaluate(deterministicInput);

  const second = service.evaluate(deterministicInput);

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    first.symbol === second.symbol &&
      first.reportDate === second.reportDate &&
      first.session === second.session &&
      first.asOf.getTime() === second.asOf.getTime() &&
      first.blackoutAfterDays === second.blackoutAfterDays &&
      first.calendarDaysSinceEarnings === second.calendarDaysSinceEarnings &&
      first.blocked === second.blocked &&
      first.status === second.status &&
      first.reason === second.reason,
  );

  console.log('PUNTO 236 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
