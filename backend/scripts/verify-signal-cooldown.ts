import {
  DEFAULT_SIGNAL_COOLDOWN_SECONDS,
  MAX_SIGNAL_COOLDOWN_SECONDS,
  MIN_SIGNAL_COOLDOWN_SECONDS,
  calculateStrategySignalCooldownEndsAt,
  isStrategySignalCooldownActive,
  normalizeStrategySignalCooldownSeconds,
} from '../src/strategies/signal-cooldown';
import type { TradingStrategy } from '../src/strategies/strategy.types';
import { StrategyValidationService } from '../src/strategies/strategy-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectReject(name: string, action: () => unknown): void {
  let rejected = false;

  try {
    action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function createStrategy(cooldownSeconds?: number): TradingStrategy {
  return {
    id: 'cooldown-strategy',
    version: '1.0.0',
    signalValiditySeconds: 300,
    signalCooldownSeconds: cooldownSeconds,
    parameters: {},
    requiredIndicators: [],

    async evaluate(context) {
      return {
        strategyId: 'cooldown-strategy',
        symbol: context.symbol,
        action: 'BUY',
        evaluatedAt: context.evaluatedAt,
        confidence: 0.8,
        reason: 'Cooldown verification',
      };
    },
  };
}

function main(): void {
  check('MIN_COOLDOWN_DEFINED', MIN_SIGNAL_COOLDOWN_SECONDS === 0);

  check('MAX_COOLDOWN_DEFINED', MAX_SIGNAL_COOLDOWN_SECONDS === 86400);

  check('DEFAULT_COOLDOWN_DEFINED', DEFAULT_SIGNAL_COOLDOWN_SECONDS === 0);

  check(
    'DEFAULT_COOLDOWN_APPLIED',
    normalizeStrategySignalCooldownSeconds(undefined) === 0,
  );

  check(
    'ZERO_COOLDOWN_ACCEPTED',
    normalizeStrategySignalCooldownSeconds(0) === 0,
  );

  check(
    'MIN_POSITIVE_COOLDOWN_ACCEPTED',
    normalizeStrategySignalCooldownSeconds(1) === 1,
  );

  check(
    'MAX_COOLDOWN_ACCEPTED',
    normalizeStrategySignalCooldownSeconds(86400) === 86400,
  );

  for (const invalid of [
    -1,
    86401,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectReject(`INVALID_COOLDOWN_REJECTED_${String(invalid)}`, () => {
      normalizeStrategySignalCooldownSeconds(invalid);
    });
  }

  expectReject('NON_NUMBER_COOLDOWN_REJECTED', () => {
    normalizeStrategySignalCooldownSeconds('60' as unknown as number);
  });

  const previousSignalAt = new Date('2026-08-13T23:00:00.000Z');

  const cooldownEndsAt = calculateStrategySignalCooldownEndsAt(
    previousSignalAt,
    300,
  );

  check(
    'COOLDOWN_END_CALCULATED_CORRECTLY',
    cooldownEndsAt.toISOString() === '2026-08-13T23:05:00.000Z',
  );

  check(
    'SOURCE_PREVIOUS_SIGNAL_AT_NOT_MUTATED',
    previousSignalAt.toISOString() === '2026-08-13T23:00:00.000Z',
  );

  check(
    'COOLDOWN_END_DEFENSIVELY_CREATED',
    cooldownEndsAt !== previousSignalAt,
  );

  check(
    'COOLDOWN_ACTIVE_BEFORE_END',
    isStrategySignalCooldownActive(
      previousSignalAt,
      new Date('2026-08-13T23:04:59.999Z'),
      300,
    ),
  );

  check(
    'COOLDOWN_INACTIVE_EXACTLY_AT_END',
    !isStrategySignalCooldownActive(
      previousSignalAt,
      new Date('2026-08-13T23:05:00.000Z'),
      300,
    ),
  );

  check(
    'COOLDOWN_INACTIVE_AFTER_END',
    !isStrategySignalCooldownActive(
      previousSignalAt,
      new Date('2026-08-13T23:05:00.001Z'),
      300,
    ),
  );

  check(
    'ZERO_COOLDOWN_ALWAYS_INACTIVE',
    !isStrategySignalCooldownActive(
      previousSignalAt,
      new Date('2026-08-13T23:00:00.000Z'),
      0,
    ),
  );

  expectReject('REFERENCE_BEFORE_PREVIOUS_SIGNAL_REJECTED', () => {
    isStrategySignalCooldownActive(
      previousSignalAt,
      new Date('2026-08-13T22:59:59.999Z'),
      300,
    );
  });

  expectReject('INVALID_PREVIOUS_SIGNAL_TIMESTAMP_REJECTED', () => {
    calculateStrategySignalCooldownEndsAt(new Date(Number.NaN), 300);
  });

  expectReject('INVALID_REFERENCE_TIMESTAMP_REJECTED', () => {
    isStrategySignalCooldownActive(previousSignalAt, new Date(Number.NaN), 300);
  });

  const validation = new StrategyValidationService();

  validation.validateStrategy(createStrategy());

  check('STRATEGY_WITH_DEFAULT_COOLDOWN_ACCEPTED', true);

  validation.validateStrategy(createStrategy(0));

  check('STRATEGY_WITH_ZERO_COOLDOWN_ACCEPTED', true);

  validation.validateStrategy(createStrategy(300));

  check('STRATEGY_WITH_CUSTOM_COOLDOWN_ACCEPTED', true);

  expectReject('STRATEGY_WITH_NEGATIVE_COOLDOWN_REJECTED', () => {
    validation.validateStrategy(createStrategy(-1));
  });

  expectReject('STRATEGY_WITH_EXCESSIVE_COOLDOWN_REJECTED', () => {
    validation.validateStrategy(createStrategy(86401));
  });

  const first = calculateStrategySignalCooldownEndsAt(previousSignalAt, 300);

  const second = calculateStrategySignalCooldownEndsAt(previousSignalAt, 300);

  check(
    'COOLDOWN_CALCULATION_DETERMINISTIC',
    first.getTime() === second.getTime(),
  );

  console.log('PUNTO 258 PASO 2 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
