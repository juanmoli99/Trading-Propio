import {
  DEFAULT_MAX_SIGNALS_PER_MINUTE,
  MAX_MAX_SIGNALS_PER_MINUTE,
  MIN_MAX_SIGNALS_PER_MINUTE,
  calculateStrategySignalFrequencyWindowStart,
  isStrategySignalFrequencyLimitReached,
  normalizeStrategyMaxSignalsPerMinute,
} from '../src/strategies/signal-frequency';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function rejects(name: string, callback: () => unknown): void {
  let rejected = false;

  try {
    callback();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function main(): void {
  check(
    'MIN_FREQUENCY_DEFINED',
    MIN_MAX_SIGNALS_PER_MINUTE === 1,
  );

  check(
    'MAX_FREQUENCY_DEFINED',
    MAX_MAX_SIGNALS_PER_MINUTE === 60,
  );

  check(
    'DEFAULT_FREQUENCY_DEFINED',
    DEFAULT_MAX_SIGNALS_PER_MINUTE === 60,
  );

  check(
    'DEFAULT_FREQUENCY_APPLIED',
    normalizeStrategyMaxSignalsPerMinute(undefined) === 60,
  );

  check(
    'MIN_FREQUENCY_ACCEPTED',
    normalizeStrategyMaxSignalsPerMinute(1) === 1,
  );

  check(
    'MAX_FREQUENCY_ACCEPTED',
    normalizeStrategyMaxSignalsPerMinute(60) === 60,
  );

  for (const value of [0, -1, 61, 1.5, NaN, Infinity, -Infinity]) {
    rejects(`INVALID_FREQUENCY_REJECTED_${String(value)}`, () =>
      normalizeStrategyMaxSignalsPerMinute(value),
    );
  }

  const referenceAt = new Date('2026-08-13T20:01:00.000Z');

  const windowStart =
    calculateStrategySignalFrequencyWindowStart(referenceAt);

  check(
    'WINDOW_START_CALCULATED_CORRECTLY',
    windowStart.toISOString() === '2026-08-13T20:00:00.000Z',
  );

  check(
    'SOURCE_REFERENCE_TIMESTAMP_NOT_MUTATED',
    referenceAt.toISOString() === '2026-08-13T20:01:00.000Z',
  );

  check(
    'WINDOW_START_DEFENSIVELY_CREATED',
    windowStart !== referenceAt,
  );

  check(
    'LIMIT_NOT_REACHED_BELOW_MAXIMUM',
    !isStrategySignalFrequencyLimitReached(2, 3),
  );

  check(
    'LIMIT_REACHED_EXACTLY_AT_MAXIMUM',
    isStrategySignalFrequencyLimitReached(3, 3),
  );

  check(
    'LIMIT_REACHED_ABOVE_MAXIMUM',
    isStrategySignalFrequencyLimitReached(4, 3),
  );

  check(
    'ZERO_EXISTING_SIGNALS_ACCEPTED',
    !isStrategySignalFrequencyLimitReached(0, 1),
  );

  rejects('NEGATIVE_SIGNAL_COUNT_REJECTED', () =>
    isStrategySignalFrequencyLimitReached(-1, 1),
  );

  rejects('FRACTIONAL_SIGNAL_COUNT_REJECTED', () =>
    isStrategySignalFrequencyLimitReached(1.5, 2),
  );

  rejects('INVALID_REFERENCE_TIMESTAMP_REJECTED', () =>
    calculateStrategySignalFrequencyWindowStart(new Date(Number.NaN)),
  );

  const deterministicA =
    calculateStrategySignalFrequencyWindowStart(referenceAt);

  const deterministicB =
    calculateStrategySignalFrequencyWindowStart(referenceAt);

  check(
    'FREQUENCY_WINDOW_CALCULATION_DETERMINISTIC',
    deterministicA.getTime() === deterministicB.getTime(),
  );

  console.log('PUNTO 259 PASO 1 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
