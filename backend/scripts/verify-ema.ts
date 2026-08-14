import { EmaService } from '../src/indicators/ema.service';

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
  tolerance = 1e-12,
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function main(): void {
  const service = new EmaService();

  const basic = service.calculate({
    values: [1, 2, 3, 4, 5],
    period: 3,
  });

  check('BASIC_EMA_CORRECT', approximatelyEqual(basic.value, 4));

  check('PERIOD_PRESERVED', basic.period === 3);

  check(
    'STANDARD_MULTIPLIER_CORRECT',
    approximatelyEqual(basic.multiplier, 0.5),
  );

  const seedOnly = service.calculate({
    values: [10, 20, 30],
    period: 3,
  });

  check('SMA_SEED_CORRECT', approximatelyEqual(seedOnly.value, 20));

  const recurrence = service.calculate({
    values: [10, 20, 30, 50],
    period: 3,
  });

  check('EMA_RECURRENCE_CORRECT', approximatelyEqual(recurrence.value, 35));

  const trailingInfluence = service.calculate({
    values: [100, 200, 300, 400],
    period: 3,
  });

  check(
    'FULL_SERIES_AFTER_SEED_USED',
    approximatelyEqual(trailingInfluence.value, 300),
  );

  const periodOne = service.calculate({
    values: [10, 20, 30],
    period: 1,
  });

  check(
    'PERIOD_ONE_MULTIPLIER_ONE',
    approximatelyEqual(periodOne.multiplier, 1),
  );

  check(
    'PERIOD_ONE_RETURNS_LAST_VALUE',
    approximatelyEqual(periodOne.value, 30),
  );

  const decimals = service.calculate({
    values: [1.5, 2.5, 3.5, 4.5],
    period: 3,
  });

  check('DECIMAL_VALUES_CORRECT', approximatelyEqual(decimals.value, 3.5));

  const negatives = service.calculate({
    values: [-10, -5, 0, 5],
    period: 3,
  });

  check('NEGATIVE_VALUES_SUPPORTED', approximatelyEqual(negatives.value, 0));

  const values = [1, 2, 3, 4, 5];
  const snapshot = [...values];

  service.calculate({
    values,
    period: 3,
  });

  check(
    'INPUT_VALUES_NOT_MUTATED',
    values.length === snapshot.length &&
      values.every((value, index) => value === snapshot[index]),
  );

  expectThrow('EMPTY_VALUES_REJECTED', () =>
    service.calculate({
      values: [],
      period: 1,
    }),
  );

  expectThrow('INSUFFICIENT_VALUES_REJECTED', () =>
    service.calculate({
      values: [1, 2],
      period: 3,
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
    expectThrow(`INVALID_PERIOD_REJECTED_${String(invalidPeriod)}`, () =>
      service.calculate({
        values: [1, 2, 3],
        period: invalidPeriod,
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
        values: [1, invalidValue, 3],
        period: 3,
      }),
    );
  }

  expectThrow('SEED_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [Number.MAX_VALUE, Number.MAX_VALUE],
      period: 2,
    }),
  );

  expectThrow('RECURRENCE_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [-Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_VALUE],
      period: 2,
    }),
  );

  const deterministicInput = {
    values: [10, 12, 15, 14, 18, 20, 19],
    period: 3,
  };

  const first = service.calculate(deterministicInput);

  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.value === second.value &&
      first.period === second.period &&
      first.multiplier === second.multiplier,
  );

  console.log('PUNTO 217 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

