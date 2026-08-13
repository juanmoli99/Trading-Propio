import type { ConfigService } from '@nestjs/config';
import { EarningsBlackoutBeforeService } from '../src/market-events/earnings-blackout-before.service';
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

function createConfigService(blackoutBeforeDays: number): ConfigService {
  return {
    get<T = unknown>(key: string): T | undefined {
      if (key === 'earnings.blackoutBeforeDays') {
        return blackoutBeforeDays as T;
      }

      return undefined;
    },
  } as ConfigService;
}

function createService(
  blackoutBeforeDays: number,
): EarningsBlackoutBeforeService {
  return new EarningsBlackoutBeforeService(
    createConfigService(blackoutBeforeDays),
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

  const allowed = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-17T12:00:00.000Z'),
  });

  check('OUTSIDE_WINDOW_ALLOWED', allowed.blocked === false);

  check('OUTSIDE_WINDOW_STATUS_CORRECT', allowed.status === 'ALLOWED');

  check('OUTSIDE_WINDOW_DAYS_CORRECT', allowed.calendarDaysRemaining === 3);

  check('CONFIG_VALUE_PRESERVED', allowed.blackoutBeforeDays === 2);

  check('ALLOWED_REASON_PRESENT', allowed.reason.length > 0);

  const boundary = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-18T12:00:00.000Z'),
  });

  check('BOUNDARY_BLOCKED', boundary.blocked === true);

  check('BOUNDARY_STATUS_CORRECT', boundary.status === 'BLACKED_OUT');

  check('BOUNDARY_DAYS_CORRECT', boundary.calendarDaysRemaining === 2);

  const inside = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check('INSIDE_WINDOW_BLOCKED', inside.blocked === true);

  check('INSIDE_WINDOW_STATUS_CORRECT', inside.status === 'BLACKED_OUT');

  const sameDay = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-20T18:00:00.000Z'),
  });

  check('EARNINGS_DAY_BLOCKED', sameDay.blocked === true);

  check('EARNINGS_DAY_STATUS_CORRECT', sameDay.status === 'BLACKED_OUT');

  check('EARNINGS_DAY_CALENDAR_DAYS_ZERO', sameDay.calendarDaysRemaining === 0);

  const past = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-21T12:00:00.000Z'),
  });

  check('PAST_EVENT_NOT_BLOCKED', past.blocked === false);

  check('PAST_EVENT_STATUS_CORRECT', past.status === 'EVENT_ALREADY_PASSED');

  const zeroConfig = createService(0);

  const zeroDayBefore = zeroConfig.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check('ZERO_CONFIG_DAY_BEFORE_ALLOWED', zeroDayBefore.blocked === false);

  const zeroSameDay = zeroConfig.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-20T12:00:00.000Z'),
  });

  check('ZERO_CONFIG_SAME_DAY_BLOCKED', zeroSameDay.blocked === true);

  const preMarket = service.evaluate({
    event: createEvent('2026-08-20', 'PRE_MARKET'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check('SESSION_PRESERVED', preMarket.session === 'PRE_MARKET');

  check('SYMBOL_PRESERVED', preMarket.symbol === 'AAPL');

  check('REPORT_DATE_PRESERVED', preMarket.reportDate === '2026-08-20');

  const asOf = new Date('2026-08-19T12:00:00.000Z');

  const defensive = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf,
  });

  check('AS_OF_PRESERVED', defensive.asOf.getTime() === asOf.getTime());

  check('AS_OF_DEFENSIVELY_COPIED', defensive.asOf !== asOf);

  expectThrow('ASSERT_REJECTS_BLACKED_OUT', () =>
    service.assertEntryAllowed({
      event: createEvent('2026-08-20'),
      asOf: new Date('2026-08-19T12:00:00.000Z'),
    }),
  );

  const assertedAllowed = service.assertEntryAllowed({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-17T12:00:00.000Z'),
  });

  check(
    'ASSERT_ALLOWED_PASSES',
    assertedAllowed.blocked === false && assertedAllowed.status === 'ALLOWED',
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
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  };

  const first = service.evaluate(deterministicInput);

  const second = service.evaluate(deterministicInput);

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    first.symbol === second.symbol &&
      first.reportDate === second.reportDate &&
      first.session === second.session &&
      first.asOf.getTime() === second.asOf.getTime() &&
      first.blackoutBeforeDays === second.blackoutBeforeDays &&
      first.calendarDaysRemaining === second.calendarDaysRemaining &&
      first.blocked === second.blocked &&
      first.status === second.status &&
      first.reason === second.reason,
  );

  console.log('PUNTO 235 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
