import { VolatilityService } from '../src/indicators/volatility.service';

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
  const service = new VolatilityService();

  const basic = service.calculate({
    values: [100, 110, 99],
    period: 2,
  });

  check('PERIOD_PRESERVED', basic.period === 2);

  check('MEAN_RETURN_CORRECT', approximatelyEqual(basic.meanReturn, 0));

  check('VARIANCE_CORRECT', approximatelyEqual(basic.variance, 0.01));

  check('VOLATILITY_CORRECT', approximatelyEqual(basic.value, 0.1));

  const constant = service.calculate({
    values: [100, 100, 100, 100],
    period: 3,
  });

  check('CONSTANT_SERIES_MEAN_ZERO', constant.meanReturn === 0);

  check('CONSTANT_SERIES_VARIANCE_ZERO', constant.variance === 0);

  check('CONSTANT_SERIES_VOLATILITY_ZERO', constant.value === 0);

  const periodOne = service.calculate({
    values: [100, 125],
    period: 1,
  });

  check('PERIOD_ONE_SUPPORTED', periodOne.period === 1);

  check(
    'PERIOD_ONE_MEAN_CORRECT',
    approximatelyEqual(periodOne.meanReturn, 0.25),
  );

  check('PERIOD_ONE_VARIANCE_ZERO', periodOne.variance === 0);

  check('PERIOD_ONE_VOLATILITY_ZERO', periodOne.value === 0);

  const trailing = service.calculate({
    values: [50, 100, 110, 99],
    period: 2,
  });

  check(
    'ONLY_TRAILING_RETURNS_USED',
    approximatelyEqual(trailing.meanReturn, 0),
  );

  check('TRAILING_VOLATILITY_CORRECT', approximatelyEqual(trailing.value, 0.1));

  const positiveReturns = service.calculate({
    values: [100, 110, 121],
    period: 2,
  });

  check(
    'EQUAL_POSITIVE_RETURNS_MEAN_CORRECT',
    approximatelyEqual(positiveReturns.meanReturn, 0.1),
  );

  check(
    'EQUAL_POSITIVE_RETURNS_VOLATILITY_ZERO',
    approximatelyEqual(positiveReturns.value, 0),
  );

  const declining = service.calculate({
    values: [100, 90, 81],
    period: 2,
  });

  check(
    'EQUAL_NEGATIVE_RETURNS_MEAN_CORRECT',
    approximatelyEqual(declining.meanReturn, -0.1),
  );

  check(
    'EQUAL_NEGATIVE_RETURNS_VOLATILITY_ZERO',
    approximatelyEqual(declining.value, 0),
  );

  const values = [100, 105, 102, 110, 108];

  const snapshot = [...values];

  service.calculate({
    values,
    period: 4,
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

  expectThrow('INSUFFICIENT_WARMUP_REJECTED', () =>
    service.calculate({
      values: [100, 101],
      period: 2,
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
        values: [100, 101, 102],
        period: invalidPeriod,
      }),
    );
  }

  for (const invalidValue of [0, -1, -100]) {
    expectThrow(`NON_POSITIVE_VALUE_REJECTED_${String(invalidValue)}`, () =>
      service.calculate({
        values: [100, invalidValue, 102],
        period: 2,
      }),
    );
  }

  for (const invalidValue of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`NON_FINITE_VALUE_REJECTED_${String(invalidValue)}`, () =>
      service.calculate({
        values: [100, invalidValue, 102],
        period: 2,
      }),
    );
  }

  expectThrow('RETURN_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [Number.MIN_VALUE, Number.MAX_VALUE],
      period: 1,
    }),
  );

  const deterministicInput = {
    values: [100, 102, 101, 105, 103, 108],
    period: 5,
  };

  const first = service.calculate(deterministicInput);

  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.value === second.value &&
      first.period === second.period &&
      first.meanReturn === second.meanReturn &&
      first.variance === second.variance,
  );

  check('FINAL_VOLATILITY_FINITE', Number.isFinite(first.value));

  check('FINAL_VOLATILITY_NON_NEGATIVE', first.value >= 0);

  check('FINAL_VARIANCE_FINITE', Number.isFinite(first.variance));

  check('FINAL_VARIANCE_NON_NEGATIVE', first.variance >= 0);

  check('FINAL_MEAN_RETURN_FINITE', Number.isFinite(first.meanReturn));

  console.log('PUNTO 225 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
