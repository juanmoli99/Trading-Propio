import { SmaService } from '../src/indicators/sma.service';

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
  const service = new SmaService();

  const basic = service.calculate({
    values: [1, 2, 3, 4, 5],
    period: 3,
  });

  check('BASIC_SMA_CORRECT', basic.value === 4);

  check('PERIOD_PRESERVED', basic.period === 3);

  const trailing = service.calculate({
    values: [1000, 2000, 10, 20, 30],
    period: 3,
  });

  check('ONLY_TRAILING_PERIOD_USED', trailing.value === 20);

  const exactLength = service.calculate({
    values: [2, 4, 6, 8],
    period: 4,
  });

  check('EXACT_PERIOD_LENGTH_CORRECT', exactLength.value === 5);

  const periodOne = service.calculate({
    values: [10, 20, 30],
    period: 1,
  });

  check('PERIOD_ONE_RETURNS_LAST_VALUE', periodOne.value === 30);

  const decimals = service.calculate({
    values: [1.5, 2.5, 3.5],
    period: 3,
  });

  check('DECIMAL_VALUES_CORRECT', approximatelyEqual(decimals.value, 2.5));

  const negatives = service.calculate({
    values: [-10, -5, 0, 5, 10],
    period: 5,
  });

  check('NEGATIVE_VALUES_SUPPORTED', negatives.value === 0);

  const mixed = service.calculate({
    values: [-5, 5, 10],
    period: 2,
  });

  check('MIXED_VALUES_CORRECT', mixed.value === 7.5);

  const immutableValues = [1, 2, 3, 4];
  const snapshot = [...immutableValues];

  service.calculate({
    values: immutableValues,
    period: 2,
  });

  check(
    'INPUT_VALUES_NOT_MUTATED',
    immutableValues.length === snapshot.length &&
      immutableValues.every((value, index) => value === snapshot[index]),
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

  expectThrow('NON_FINITE_RESULT_REJECTED', () =>
    service.calculate({
      values: [Number.MAX_VALUE, Number.MAX_VALUE],
      period: 2,
    }),
  );

  const deterministicInput = {
    values: [10, 20, 30, 40, 50],
    period: 4,
  };

  const first = service.calculate(deterministicInput);

  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.value === second.value && first.period === second.period,
  );

  console.log('PUNTO 212 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

