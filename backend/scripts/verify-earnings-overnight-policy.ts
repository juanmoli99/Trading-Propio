import type { ConfigService } from '@nestjs/config';
import { EarningsOvernightPolicyService } from '../src/market-events/earnings-overnight-policy.service';
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

function createConfigService(
  enabled: boolean,
  prohibitionDays: number,
): ConfigService {
  return {
    get<T = unknown>(key: string): T | undefined {
      if (key === 'earnings.overnightProhibitionEnabled') {
        return enabled as T;
      }

      if (key === 'earnings.overnightProhibitionDays') {
        return prohibitionDays as T;
      }

      return undefined;
    },
  } as ConfigService;
}

function createService(
  enabled: boolean,
  prohibitionDays: number,
): EarningsOvernightPolicyService {
  return new EarningsOvernightPolicyService(
    createConfigService(enabled, prohibitionDays),
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
  const disabled = createService(false, 2);

  const disabledResult = disabled.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check('DISABLED_OVERNIGHT_ALLOWED', disabledResult.overnightAllowed === true);

  check(
    'DISABLED_NO_EXIT_REQUIRED',
    disabledResult.mustExitBeforeOvernight === false,
  );

  check('DISABLED_STATUS_CORRECT', disabledResult.status === 'DISABLED');

  check('DISABLED_ENABLED_FLAG_FALSE', disabledResult.enabled === false);

  const service = createService(true, 2);

  const outside = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-17T12:00:00.000Z'),
  });

  check('OUTSIDE_WINDOW_OVERNIGHT_ALLOWED', outside.overnightAllowed === true);

  check(
    'OUTSIDE_WINDOW_NO_EXIT_REQUIRED',
    outside.mustExitBeforeOvernight === false,
  );

  check('OUTSIDE_WINDOW_STATUS_CORRECT', outside.status === 'ALLOWED');

  check('OUTSIDE_WINDOW_DAYS_CORRECT', outside.calendarDaysRemaining === 3);

  check('CONFIG_PROHIBITION_DAYS_PRESERVED', outside.prohibitionDays === 2);

  const boundary = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-18T12:00:00.000Z'),
  });

  check('BOUNDARY_OVERNIGHT_PROHIBITED', boundary.overnightAllowed === false);

  check('BOUNDARY_EXIT_REQUIRED', boundary.mustExitBeforeOvernight === true);

  check('BOUNDARY_STATUS_CORRECT', boundary.status === 'OVERNIGHT_PROHIBITED');

  check('BOUNDARY_DAYS_CORRECT', boundary.calendarDaysRemaining === 2);

  const dayBefore = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check(
    'DAY_BEFORE_OVERNIGHT_PROHIBITED',
    dayBefore.overnightAllowed === false,
  );

  check('DAY_BEFORE_EXIT_REQUIRED', dayBefore.mustExitBeforeOvernight === true);

  check(
    'DAY_BEFORE_STATUS_CORRECT',
    dayBefore.status === 'OVERNIGHT_PROHIBITED',
  );

  check('DAY_BEFORE_DAYS_CORRECT', dayBefore.calendarDaysRemaining === 1);

  const sameDay = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-20T12:00:00.000Z'),
  });

  check(
    'SAME_DAY_OVERNIGHT_ALLOWED_BY_THIS_POLICY',
    sameDay.overnightAllowed === true,
  );

  check(
    'SAME_DAY_NO_EXIT_REQUIRED_BY_THIS_POLICY',
    sameDay.mustExitBeforeOvernight === false,
  );

  check('SAME_DAY_STATUS_NOT_APPLICABLE', sameDay.status === 'NOT_APPLICABLE');

  check('SAME_DAY_DAYS_ZERO', sameDay.calendarDaysRemaining === 0);

  const past = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-21T12:00:00.000Z'),
  });

  check('PAST_EVENT_OVERNIGHT_ALLOWED', past.overnightAllowed === true);

  check('PAST_EVENT_NO_EXIT_REQUIRED', past.mustExitBeforeOvernight === false);

  check('PAST_EVENT_STATUS_NOT_APPLICABLE', past.status === 'NOT_APPLICABLE');

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

  check('REASON_PRESENT', defensive.reason.length > 0);

  expectThrow('ASSERT_REJECTS_PROHIBITED_OVERNIGHT', () =>
    service.assertOvernightAllowed({
      event: createEvent('2026-08-20'),
      asOf: new Date('2026-08-19T12:00:00.000Z'),
    }),
  );

  const assertedOutside = service.assertOvernightAllowed({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-17T12:00:00.000Z'),
  });

  check(
    'ASSERT_OUTSIDE_WINDOW_PASSES',
    assertedOutside.overnightAllowed === true &&
      assertedOutside.status === 'ALLOWED',
  );

  const assertedSameDay = service.assertOvernightAllowed({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-20T12:00:00.000Z'),
  });

  check(
    'ASSERT_SAME_DAY_PASSES_THIS_POLICY',
    assertedSameDay.overnightAllowed === true &&
      assertedSameDay.status === 'NOT_APPLICABLE',
  );

  for (const invalidDays of [
    0,
    -1,
    1.5,
    366,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(
      `INVALID_PROHIBITION_DAYS_REJECTED_${String(invalidDays)}`,
      () => createService(true, invalidDays),
    );
  }

  expectThrow('INVALID_ENABLED_REJECTED', () => {
    const config = {
      get<T = unknown>(key: string): T | undefined {
        if (key === 'earnings.overnightProhibitionEnabled') {
          return 'true' as T;
        }

        if (key === 'earnings.overnightProhibitionDays') {
          return 1 as T;
        }

        return undefined;
      },
    } as ConfigService;

    new EarningsOvernightPolicyService(
      config,
      new EarningsTimeRemainingService(),
    );
  });

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
      first.enabled === second.enabled &&
      first.prohibitionDays === second.prohibitionDays &&
      first.calendarDaysRemaining === second.calendarDaysRemaining &&
      first.overnightAllowed === second.overnightAllowed &&
      first.mustExitBeforeOvernight === second.mustExitBeforeOvernight &&
      first.status === second.status &&
      first.reason === second.reason,
  );

  console.log('PUNTO 238 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
