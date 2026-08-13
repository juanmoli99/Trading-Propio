import { RsiService } from '../src/indicators/rsi.service';

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
  const service = new RsiService();

  const initialOnly = service.calculate({
    values: [10, 11, 10, 12],
    period: 3,
  });

  check('PERIOD_PRESERVED', initialOnly.period === 3);

  check(
    'INITIAL_AVERAGE_GAIN_CORRECT',
    approximatelyEqual(initialOnly.averageGain, 1),
  );

  check(
    'INITIAL_AVERAGE_LOSS_CORRECT',
    approximatelyEqual(initialOnly.averageLoss, 1 / 3),
  );

  check('INITIAL_RSI_CORRECT', approximatelyEqual(initialOnly.value, 75));

  const smoothed = service.calculate({
    values: [10, 11, 10, 12, 11],
    period: 3,
  });

  check(
    'WILDER_GAIN_SMOOTHING_CORRECT',
    approximatelyEqual(smoothed.averageGain, 2 / 3),
  );

  check(
    'WILDER_LOSS_SMOOTHING_CORRECT',
    approximatelyEqual(smoothed.averageLoss, 5 / 9),
  );

  check(
    'WILDER_RSI_CORRECT',
    approximatelyEqual(smoothed.value, 54.54545454545455),
  );

  const allGains = service.calculate({
    values: [1, 2, 3, 4, 5],
    period: 3,
  });

  check('ALL_GAINS_RSI_100', allGains.value === 100);

  check('ALL_GAINS_AVERAGE_LOSS_ZERO', allGains.averageLoss === 0);

  const allLosses = service.calculate({
    values: [5, 4, 3, 2, 1],
    period: 3,
  });

  check('ALL_LOSSES_RSI_0', allLosses.value === 0);

  check('ALL_LOSSES_AVERAGE_GAIN_ZERO', allLosses.averageGain === 0);

  const flat = service.calculate({
    values: [100, 100, 100, 100],
    period: 3,
  });

  check('FLAT_SERIES_RSI_50', flat.value === 50);

  check(
    'FLAT_SERIES_AVERAGES_ZERO',
    flat.averageGain === 0 && flat.averageLoss === 0,
  );

  const periodOne = service.calculate({
    values: [10, 20],
    period: 1,
  });

  check('PERIOD_ONE_SUPPORTED', periodOne.period === 1);

  check('PERIOD_ONE_GAIN_RSI_100', periodOne.value === 100);

  const negatives = service.calculate({
    values: [-10, -8, -9, -7],
    period: 3,
  });

  check(
    'NEGATIVE_PRICE_VALUES_SUPPORTED',
    approximatelyEqual(negatives.value, 80),
  );

  const decimals = service.calculate({
    values: [1.1, 1.2, 1.15, 1.3],
    period: 3,
  });

  check('DECIMAL_RESULT_FINITE', Number.isFinite(decimals.value));

  check('RSI_WITHIN_RANGE', decimals.value >= 0 && decimals.value <= 100);

  const inputValues = [10, 11, 10, 12, 11];

  const snapshot = [...inputValues];

  service.calculate({
    values: inputValues,
    period: 3,
  });

  check(
    'INPUT_VALUES_NOT_MUTATED',
    inputValues.length === snapshot.length &&
      inputValues.every((value, index) => value === snapshot[index]),
  );

  expectThrow('EMPTY_VALUES_REJECTED', () =>
    service.calculate({
      values: [],
      period: 3,
    }),
  );

  expectThrow('PERIOD_ONLY_VALUES_REJECTED', () =>
    service.calculate({
      values: [1, 2, 3],
      period: 3,
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
        values: [1, 2, 3, 4],
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
        values: [1, 2, invalidValue, 4],
        period: 3,
      }),
    );
  }

  expectThrow('PRICE_CHANGE_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [-Number.MAX_VALUE, Number.MAX_VALUE],
      period: 1,
    }),
  );

  expectThrow('INITIAL_GAIN_SUM_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [0, Number.MAX_VALUE, 0, Number.MAX_VALUE],
      period: 3,
    }),
  );

  const deterministicInput = {
    values: [100, 102, 101, 105, 103, 106, 108, 107],
    period: 3,
  };

  const first = service.calculate(deterministicInput);

  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.value === second.value &&
      first.period === second.period &&
      first.averageGain === second.averageGain &&
      first.averageLoss === second.averageLoss,
  );

  check('FINAL_RSI_FINITE', Number.isFinite(first.value));

  check('FINAL_RSI_BOUNDED', first.value >= 0 && first.value <= 100);

  console.log('PUNTO 218 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
