import {
  DEFAULT_MAX_SIGNALS,
  MAX_MAX_SIGNALS,
  MIN_MAX_SIGNALS,
  isStrategySignalTotalLimitReached,
  normalizeStrategyMaxSignals,
} from '../src/strategies/signal-total-limit';

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

function main(): void {
  check('MIN_TOTAL_LIMIT_DEFINED', MIN_MAX_SIGNALS === 1);

  check('MAX_TOTAL_LIMIT_DEFINED', MAX_MAX_SIGNALS === 1_000_000);

  check('DEFAULT_TOTAL_LIMIT_DEFINED', DEFAULT_MAX_SIGNALS === 1_000_000);

  check(
    'DEFAULT_TOTAL_LIMIT_APPLIED',
    normalizeStrategyMaxSignals(undefined) === DEFAULT_MAX_SIGNALS,
  );

  check(
    'MIN_TOTAL_LIMIT_ACCEPTED',
    normalizeStrategyMaxSignals(MIN_MAX_SIGNALS) === MIN_MAX_SIGNALS,
  );

  check(
    'MAX_TOTAL_LIMIT_ACCEPTED',
    normalizeStrategyMaxSignals(MAX_MAX_SIGNALS) === MAX_MAX_SIGNALS,
  );

  const invalidValues = [
    0,
    -1,
    MAX_MAX_SIGNALS + 1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  for (const value of invalidValues) {
    expectReject(`INVALID_TOTAL_LIMIT_REJECTED_${String(value)}`, () =>
      normalizeStrategyMaxSignals(value),
    );
  }

  check(
    'TOTAL_LIMIT_NOT_REACHED_BELOW_MAXIMUM',
    !isStrategySignalTotalLimitReached(4, 5),
  );

  check(
    'TOTAL_LIMIT_REACHED_EXACTLY_AT_MAXIMUM',
    isStrategySignalTotalLimitReached(5, 5),
  );

  check(
    'TOTAL_LIMIT_REACHED_ABOVE_MAXIMUM',
    isStrategySignalTotalLimitReached(6, 5),
  );

  check(
    'ZERO_EXISTING_SIGNALS_ACCEPTED',
    !isStrategySignalTotalLimitReached(0, 1),
  );

  expectReject('NEGATIVE_TOTAL_SIGNAL_COUNT_REJECTED', () =>
    isStrategySignalTotalLimitReached(-1, 5),
  );

  expectReject('FRACTIONAL_TOTAL_SIGNAL_COUNT_REJECTED', () =>
    isStrategySignalTotalLimitReached(1.5, 5),
  );

  const first = isStrategySignalTotalLimitReached(10, 10);
  const second = isStrategySignalTotalLimitReached(10, 10);

  check(
    'TOTAL_LIMIT_CALCULATION_DETERMINISTIC',
    first === second && first === true,
  );

  console.log('PUNTO 260 PASO 1 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

