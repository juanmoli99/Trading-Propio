import type { ConfigService } from '@nestjs/config';
import { EarningsPositionSizeReductionService } from '../src/market-events/earnings-position-size-reduction.service';
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
  reductionDays: number,
  multiplier: number,
): ConfigService {
  return {
    get<T = unknown>(key: string): T | undefined {
      if (key === 'earnings.positionSizeReductionEnabled') {
        return enabled as T;
      }

      if (key === 'earnings.positionSizeReductionDays') {
        return reductionDays as T;
      }

      if (key === 'earnings.positionSizeMultiplier') {
        return multiplier as T;
      }

      return undefined;
    },
  } as ConfigService;
}

function createService(
  enabled: boolean,
  reductionDays: number,
  multiplier: number,
): EarningsPositionSizeReductionService {
  return new EarningsPositionSizeReductionService(
    createConfigService(enabled, reductionDays, multiplier),
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
  const disabled = createService(false, 3, 0.5);

  const disabledResult = disabled.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-18T12:00:00.000Z'),
  });

  check('DISABLED_NOT_REDUCED', disabledResult.reduced === false);

  check('DISABLED_STATUS_CORRECT', disabledResult.status === 'DISABLED');

  check('DISABLED_MULTIPLIER_ONE', disabledResult.multiplier === 1);

  check('DISABLED_ENABLED_FLAG_FALSE', disabledResult.enabled === false);

  const service = createService(true, 3, 0.5);

  const outside = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-16T12:00:00.000Z'),
  });

  check('OUTSIDE_WINDOW_NOT_REDUCED', outside.reduced === false);

  check('OUTSIDE_WINDOW_STATUS_CORRECT', outside.status === 'NOT_APPLICABLE');

  check('OUTSIDE_WINDOW_MULTIPLIER_ONE', outside.multiplier === 1);

  check('OUTSIDE_WINDOW_DAYS_CORRECT', outside.calendarDaysRemaining === 4);

  const boundary = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-17T12:00:00.000Z'),
  });

  check('BOUNDARY_REDUCED', boundary.reduced === true);

  check('BOUNDARY_STATUS_CORRECT', boundary.status === 'REDUCED');

  check('BOUNDARY_MULTIPLIER_CORRECT', boundary.multiplier === 0.5);

  check('BOUNDARY_DAYS_CORRECT', boundary.calendarDaysRemaining === 3);

  const inside = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check('INSIDE_WINDOW_REDUCED', inside.reduced === true);

  check('INSIDE_WINDOW_MULTIPLIER_CORRECT', inside.multiplier === 0.5);

  check('CONFIG_REDUCTION_DAYS_PRESERVED', inside.reductionDays === 3);

  const sameDay = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-20T12:00:00.000Z'),
  });

  check('SAME_DAY_NOT_REDUCED', sameDay.reduced === false);

  check('SAME_DAY_STATUS_NOT_APPLICABLE', sameDay.status === 'NOT_APPLICABLE');

  check('SAME_DAY_MULTIPLIER_ONE', sameDay.multiplier === 1);

  const past = service.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-21T12:00:00.000Z'),
  });

  check('PAST_EVENT_NOT_REDUCED', past.reduced === false);

  check('PAST_EVENT_STATUS_NOT_APPLICABLE', past.status === 'NOT_APPLICABLE');

  check('PAST_EVENT_MULTIPLIER_ONE', past.multiplier === 1);

  const multiplierOne = createService(true, 3, 1);

  const multiplierOneResult = multiplierOne.evaluate({
    event: createEvent('2026-08-20'),
    asOf: new Date('2026-08-19T12:00:00.000Z'),
  });

  check('MULTIPLIER_ONE_VALUE_PRESERVED', multiplierOneResult.multiplier === 1);

  check('MULTIPLIER_ONE_NOT_REDUCED', multiplierOneResult.reduced === false);

  check(
    'MULTIPLIER_ONE_STATUS_REDUCED_POLICY_APPLIED',
    multiplierOneResult.status === 'REDUCED',
  );

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

  for (const invalidDays of [
    0,
    -1,
    1.5,
    366,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_REDUCTION_DAYS_REJECTED_${String(invalidDays)}`, () =>
      createService(true, invalidDays, 0.5),
    );
  }

  for (const invalidMultiplier of [
    0,
    -1,
    1.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(
      `INVALID_MULTIPLIER_REJECTED_${String(invalidMultiplier)}`,
      () => createService(true, 3, invalidMultiplier),
    );
  }

  expectThrow('INVALID_ENABLED_REJECTED', () => {
    const config = {
      get<T = unknown>(key: string): T | undefined {
        if (key === 'earnings.positionSizeReductionEnabled') {
          return 'true' as T;
        }

        if (key === 'earnings.positionSizeReductionDays') {
          return 3 as T;
        }

        if (key === 'earnings.positionSizeMultiplier') {
          return 0.5 as T;
        }

        return undefined;
      },
    } as ConfigService;

    new EarningsPositionSizeReductionService(
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
      first.reductionDays === second.reductionDays &&
      first.calendarDaysRemaining === second.calendarDaysRemaining &&
      first.multiplier === second.multiplier &&
      first.reduced === second.reduced &&
      first.status === second.status &&
      first.reason === second.reason,
  );

  console.log('PUNTO 237 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
