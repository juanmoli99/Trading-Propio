import { ReturnsService } from '../src/indicators/returns.service';

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
  const service = new ReturnsService();

  const basic = service.calculate({
    values: [100, 110, 99],
  });

  check('RESULT_COUNT_CORRECT', basic.values.length === 2);

  check(
    'POSITIVE_RETURN_CORRECT',
    approximatelyEqual(basic.values[0] as number, 0.1),
  );

  check(
    'NEGATIVE_RETURN_CORRECT',
    approximatelyEqual(basic.values[1] as number, -0.1),
  );

  check('LATEST_RETURN_CORRECT', approximatelyEqual(basic.latest, -0.1));

  const unchanged = service.calculate({
    values: [100, 100],
  });

  check('ZERO_RETURN_SUPPORTED', unchanged.values[0] === 0);
  check('ZERO_LATEST_RETURN_SUPPORTED', unchanged.latest === 0);

  const singleIncrease = service.calculate({
    values: [100, 125],
  });

  check('TWO_VALUES_PRODUCE_ONE_RETURN', singleIncrease.values.length === 1);

  check(
    'SINGLE_RETURN_CORRECT',
    approximatelyEqual(singleIncrease.latest, 0.25),
  );

  const singleDecrease = service.calculate({
    values: [100, 75],
  });

  check(
    'DECREASE_RETURN_CORRECT',
    approximatelyEqual(singleDecrease.latest, -0.25),
  );

  const completeSeries = service.calculate({
    values: [100, 110, 121, 108.9],
  });

  check('COMPLETE_SERIES_COUNT_CORRECT', completeSeries.values.length === 3);

  check(
    'FIRST_SERIES_RETURN_CORRECT',
    approximatelyEqual(completeSeries.values[0] as number, 0.1),
  );

  check(
    'SECOND_SERIES_RETURN_CORRECT',
    approximatelyEqual(completeSeries.values[1] as number, 0.1),
  );

  check(
    'THIRD_SERIES_RETURN_CORRECT',
    approximatelyEqual(completeSeries.values[2] as number, -0.1),
  );

  check(
    'LATEST_MATCHES_LAST_RESULT',
    completeSeries.latest ===
      completeSeries.values[completeSeries.values.length - 1],
  );

  const fractional = service.calculate({
    values: [0.5, 0.75, 1.5],
  });

  check(
    'FRACTIONAL_PRICES_SUPPORTED',
    approximatelyEqual(fractional.values[0] as number, 0.5) &&
      approximatelyEqual(fractional.values[1] as number, 1),
  );

  const values = [100, 105, 102, 110];
  const snapshot = [...values];

  const immutableResult = service.calculate({
    values,
  });

  check(
    'INPUT_VALUES_NOT_MUTATED',
    values.length === snapshot.length &&
      values.every((value, index) => value === snapshot[index]),
  );

  const returnedValues = immutableResult.values;

  check('RESULT_ARRAY_DISTINCT_FROM_INPUT', returnedValues !== values);

  expectThrow('EMPTY_VALUES_REJECTED', () =>
    service.calculate({
      values: [],
    }),
  );

  expectThrow('SINGLE_VALUE_REJECTED', () =>
    service.calculate({
      values: [100],
    }),
  );

  for (const invalidValue of [0, -1, -100]) {
    expectThrow(`NON_POSITIVE_VALUE_REJECTED_${String(invalidValue)}`, () =>
      service.calculate({
        values: [100, invalidValue, 110],
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
        values: [100, invalidValue, 110],
      }),
    );
  }

  expectThrow('RETURN_OVERFLOW_REJECTED', () =>
    service.calculate({
      values: [Number.MIN_VALUE, Number.MAX_VALUE],
    }),
  );

  const extremeDecrease = service.calculate({
    values: [Number.MAX_VALUE, Number.MIN_VALUE],
  });

  check(
    'EXTREME_FINITE_DECREASE_SUPPORTED',
    Number.isFinite(extremeDecrease.latest),
  );

  check('EXTREME_DECREASE_APPROACHES_MINUS_ONE', extremeDecrease.latest === -1);

  const deterministicInput = {
    values: [100, 103, 101, 108, 104, 112],
  };

  const first = service.calculate(deterministicInput);
  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.latest === second.latest &&
      first.values.length === second.values.length &&
      first.values.every((value, index) => value === second.values[index]),
  );

  check(
    'ALL_RESULTS_FINITE',
    first.values.every((value) => Number.isFinite(value)),
  );

  check('LATEST_RESULT_FINITE', Number.isFinite(first.latest));

  check(
    'RESULT_COUNT_INVARIANT',
    first.values.length === deterministicInput.values.length - 1,
  );

  console.log('PUNTO 226 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
