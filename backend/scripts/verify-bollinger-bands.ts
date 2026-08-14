import { BollingerBandsService } from '../src/indicators/bollinger-bands.service';

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
  const service = new BollingerBandsService();

  const basic = service.calculate({
    values: [1, 2, 3, 4, 5],
    period: 5,
    standardDeviationMultiplier: 2,
  });

  check('PERIOD_PRESERVED', basic.period === 5);

  check('MULTIPLIER_PRESERVED', basic.standardDeviationMultiplier === 2);

  check('MIDDLE_BAND_CORRECT', approximatelyEqual(basic.middle, 3));

  check(
    'STANDARD_DEVIATION_CORRECT',
    approximatelyEqual(basic.standardDeviation, Math.sqrt(2)),
  );

  check(
    'UPPER_BAND_CORRECT',
    approximatelyEqual(basic.upper, 3 + 2 * Math.sqrt(2)),
  );

  check(
    'LOWER_BAND_CORRECT',
    approximatelyEqual(basic.lower, 3 - 2 * Math.sqrt(2)),
  );

  check(
    'BAND_ORDER_CORRECT',
    basic.lower <= basic.middle && basic.middle <= basic.upper,
  );

  const trailing = service.calculate({
    values: [1000, 2000, 1, 2, 3, 4, 5],
    period: 5,
    standardDeviationMultiplier: 2,
  });

  check(
    'ONLY_TRAILING_PERIOD_USED',
    approximatelyEqual(trailing.middle, 3) &&
      approximatelyEqual(trailing.standardDeviation, Math.sqrt(2)),
  );

  const constant = service.calculate({
    values: [10, 10, 10, 10, 10],
    period: 5,
    standardDeviationMultiplier: 2,
  });

  check(
    'CONSTANT_SERIES_STANDARD_DEVIATION_ZERO',
    constant.standardDeviation === 0,
  );

  check(
    'CONSTANT_SERIES_BANDS_EQUAL',
    constant.lower === 10 && constant.middle === 10 && constant.upper === 10,
  );

  const zeroMultiplier = service.calculate({
    values: [1, 2, 3, 4, 5],
    period: 5,
    standardDeviationMultiplier: 0,
  });

  check(
    'ZERO_MULTIPLIER_SUPPORTED',
    zeroMultiplier.standardDeviationMultiplier === 0,
  );

  check(
    'ZERO_MULTIPLIER_COLLAPSES_BANDS',
    zeroMultiplier.lower === zeroMultiplier.middle &&
      zeroMultiplier.upper === zeroMultiplier.middle,
  );

  const periodOne = service.calculate({
    values: [1, 2, 99],
    period: 1,
    standardDeviationMultiplier: 2,
  });

  check('PERIOD_ONE_USES_LAST_VALUE', periodOne.middle === 99);

  check(
    'PERIOD_ONE_STANDARD_DEVIATION_ZERO',
    periodOne.standardDeviation === 0,
  );

  const negative = service.calculate({
    values: [-5, -4, -3, -2, -1],
    period: 5,
    standardDeviationMultiplier: 2,
  });

  check('NEGATIVE_VALUES_SUPPORTED', approximatelyEqual(negative.middle, -3));

  check(
    'NEGATIVE_VALUES_RESULT_FINITE',
    Number.isFinite(negative.lower) &&
      Number.isFinite(negative.middle) &&
      Number.isFinite(negative.upper) &&
      Number.isFinite(negative.standardDeviation),
  );

  const values = [1, 2, 3, 4, 5, 6];
  const snapshot = [...values];

  service.calculate({
    values,
    period: 5,
    standardDeviationMultiplier: 2,
  });

  check(
    'INPUT_VALUES_NOT_MUTATED',
    values.length === snapshot.length &&
      values.every((value, index) => value === snapshot[index]),
  );

  expectThrow('EMPTY_VALUES_REJECTED', () =>
    service.calculate({
      values: [],
      period: 5,
      standardDeviationMultiplier: 2,
    }),
  );

  expectThrow('INSUFFICIENT_VALUES_REJECTED', () =>
    service.calculate({
      values: [1, 2, 3, 4],
      period: 5,
      standardDeviationMultiplier: 2,
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
        values: [1, 2, 3, 4, 5],
        period: invalidPeriod,
        standardDeviationMultiplier: 2,
      }),
    );
  }

  for (const invalidMultiplier of [
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(
      `INVALID_MULTIPLIER_REJECTED_${String(invalidMultiplier)}`,
      () =>
        service.calculate({
          values: [1, 2, 3, 4, 5],
          period: 5,
          standardDeviationMultiplier: invalidMultiplier,
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
        values: [1, 2, invalidValue, 4, 5],
        period: 5,
        standardDeviationMultiplier: 2,
      }),
    );
  }

  expectThrow('MEAN_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [Number.MAX_VALUE, Number.MAX_VALUE],
      period: 2,
      standardDeviationMultiplier: 2,
    }),
  );

  expectThrow('VARIANCE_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [Number.MAX_VALUE, -Number.MAX_VALUE],
      period: 2,
      standardDeviationMultiplier: 2,
    }),
  );

  expectThrow('DEVIATION_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [-1e154, 1e154],
      period: 2,
      standardDeviationMultiplier: Number.MAX_VALUE,
    }),
  );

  const deterministicInput = {
    values: [100, 102, 101, 105, 103, 107, 108, 106, 110, 109],
    period: 5,
    standardDeviationMultiplier: 2,
  };

  const first = service.calculate(deterministicInput);
  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.middle === second.middle &&
      first.upper === second.upper &&
      first.lower === second.lower &&
      first.standardDeviation === second.standardDeviation &&
      first.period === second.period &&
      first.standardDeviationMultiplier === second.standardDeviationMultiplier,
  );

  check(
    'FINAL_RESULTS_FINITE',
    Number.isFinite(first.middle) &&
      Number.isFinite(first.upper) &&
      Number.isFinite(first.lower) &&
      Number.isFinite(first.standardDeviation),
  );

  check(
    'FINAL_BAND_INVARIANT',
    first.lower <= first.middle && first.middle <= first.upper,
  );

  console.log('PUNTO 221 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

