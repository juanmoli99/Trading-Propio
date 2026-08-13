import { MacdService } from '../src/indicators/macd.service';

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

function approximatelyEqual(
  actual: number,
  expected: number,
  tolerance = 1e-10,
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function main(): void {
  const service = new MacdService();

  const simple = service.calculate({
    values: [1, 2, 3, 4, 5, 6, 7],
    fastPeriod: 2,
    slowPeriod: 3,
    signalPeriod: 2,
  });

  check('FAST_PERIOD_PRESERVED', simple.fastPeriod === 2);

  check('SLOW_PERIOD_PRESERVED', simple.slowPeriod === 3);

  check('SIGNAL_PERIOD_PRESERVED', simple.signalPeriod === 2);

  check('MACD_VALUE_FINITE', Number.isFinite(simple.macd));

  check('SIGNAL_VALUE_FINITE', Number.isFinite(simple.signal));

  check('HISTOGRAM_VALUE_FINITE', Number.isFinite(simple.histogram));

  check(
    'HISTOGRAM_IDENTITY_CORRECT',
    approximatelyEqual(simple.histogram, simple.macd - simple.signal),
  );

  const constant = service.calculate({
    values: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
    fastPeriod: 2,
    slowPeriod: 4,
    signalPeriod: 3,
  });

  check('CONSTANT_SERIES_MACD_ZERO', approximatelyEqual(constant.macd, 0));

  check('CONSTANT_SERIES_SIGNAL_ZERO', approximatelyEqual(constant.signal, 0));

  check(
    'CONSTANT_SERIES_HISTOGRAM_ZERO',
    approximatelyEqual(constant.histogram, 0),
  );

  const increasing = service.calculate({
    values: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    fastPeriod: 3,
    slowPeriod: 5,
    signalPeriod: 3,
  });

  check('INCREASING_SERIES_MACD_POSITIVE', increasing.macd > 0);

  check(
    'INCREASING_SERIES_VALUES_FINITE',
    Number.isFinite(increasing.macd) &&
      Number.isFinite(increasing.signal) &&
      Number.isFinite(increasing.histogram),
  );

  const decreasing = service.calculate({
    values: [21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10],
    fastPeriod: 3,
    slowPeriod: 5,
    signalPeriod: 3,
  });

  check('DECREASING_SERIES_MACD_NEGATIVE', decreasing.macd < 0);

  const minimumLength = 5 + 3 - 1;

  const minimumInput = service.calculate({
    values: Array.from({ length: minimumLength }, (_, index) => index + 1),
    fastPeriod: 3,
    slowPeriod: 5,
    signalPeriod: 3,
  });

  check(
    'MINIMUM_WARMUP_ACCEPTED',
    Number.isFinite(minimumInput.macd) && Number.isFinite(minimumInput.signal),
  );

  expectThrow('INSUFFICIENT_WARMUP_REJECTED', () =>
    service.calculate({
      values: Array.from(
        {
          length: minimumLength - 1,
        },
        (_, index) => index + 1,
      ),
      fastPeriod: 3,
      slowPeriod: 5,
      signalPeriod: 3,
    }),
  );

  expectThrow('FAST_EQUALS_SLOW_REJECTED', () =>
    service.calculate({
      values: [1, 2, 3, 4, 5],
      fastPeriod: 3,
      slowPeriod: 3,
      signalPeriod: 2,
    }),
  );

  expectThrow('FAST_GREATER_THAN_SLOW_REJECTED', () =>
    service.calculate({
      values: [1, 2, 3, 4, 5, 6],
      fastPeriod: 4,
      slowPeriod: 3,
      signalPeriod: 2,
    }),
  );

  for (const invalidPeriod of [
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_FAST_PERIOD_REJECTED_${String(invalidPeriod)}`, () =>
      service.calculate({
        values: [1, 2, 3, 4, 5, 6],
        fastPeriod: invalidPeriod,
        slowPeriod: 3,
        signalPeriod: 2,
      }),
    );

    expectThrow(`INVALID_SLOW_PERIOD_REJECTED_${String(invalidPeriod)}`, () =>
      service.calculate({
        values: [1, 2, 3, 4, 5, 6],
        fastPeriod: 2,
        slowPeriod: invalidPeriod,
        signalPeriod: 2,
      }),
    );

    expectThrow(`INVALID_SIGNAL_PERIOD_REJECTED_${String(invalidPeriod)}`, () =>
      service.calculate({
        values: [1, 2, 3, 4, 5, 6],
        fastPeriod: 2,
        slowPeriod: 3,
        signalPeriod: invalidPeriod,
      }),
    );
  }

  for (const invalidValue of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_VALUE_REJECTED_${String(invalidValue)}`, () =>
      service.calculate({
        values: [1, 2, invalidValue, 4, 5, 6],
        fastPeriod: 2,
        slowPeriod: 3,
        signalPeriod: 2,
      }),
    );
  }

  const values = [1, 2, 3, 4, 5, 6, 7];

  const snapshot = [...values];

  service.calculate({
    values,
    fastPeriod: 2,
    slowPeriod: 3,
    signalPeriod: 2,
  });

  check(
    'INPUT_VALUES_NOT_MUTATED',
    values.length === snapshot.length &&
      values.every((value, index) => value === snapshot[index]),
  );

  expectThrow('EMA_SEED_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [Number.MAX_VALUE, Number.MAX_VALUE, 1, 2, 3, 4],
      fastPeriod: 2,
      slowPeriod: 3,
      signalPeriod: 2,
    }),
  );

  const deterministicInput = {
    values: [
      100, 101, 103, 102, 105, 108, 107, 110, 111, 109, 112, 115, 114, 116,
    ],
    fastPeriod: 3,
    slowPeriod: 5,
    signalPeriod: 3,
  };

  const first = service.calculate(deterministicInput);

  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.macd === second.macd &&
      first.signal === second.signal &&
      first.histogram === second.histogram &&
      first.fastPeriod === second.fastPeriod &&
      first.slowPeriod === second.slowPeriod &&
      first.signalPeriod === second.signalPeriod,
  );

  console.log('PUNTO 220 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
