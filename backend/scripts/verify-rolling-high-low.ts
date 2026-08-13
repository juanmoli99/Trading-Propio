import { RollingHighLowService } from '../src/indicators/rolling-high-low.service';

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

function main(): void {
  const service = new RollingHighLowService();

  const basic = service.calculate({
    values: [10, 20, 15, 30, 5],
    period: 5,
  });

  check('BASIC_HIGH_CORRECT', basic.high === 30);
  check('BASIC_LOW_CORRECT', basic.low === 5);
  check('PERIOD_PRESERVED', basic.period === 5);

  const trailing = service.calculate({
    values: [1000, -1000, 10, 20, 15, 30, 5],
    period: 5,
  });

  check(
    'ONLY_TRAILING_PERIOD_USED',
    trailing.high === 30 && trailing.low === 5,
  );

  const exactPeriod = service.calculate({
    values: [4, 8, 2],
    period: 3,
  });

  check('EXACT_PERIOD_HIGH_CORRECT', exactPeriod.high === 8);
  check('EXACT_PERIOD_LOW_CORRECT', exactPeriod.low === 2);

  const periodOne = service.calculate({
    values: [10, 20, 30],
    period: 1,
  });

  check('PERIOD_ONE_HIGH_IS_LAST_VALUE', periodOne.high === 30);
  check('PERIOD_ONE_LOW_IS_LAST_VALUE', periodOne.low === 30);

  const constant = service.calculate({
    values: [50, 50, 50, 50],
    period: 4,
  });

  check('CONSTANT_SERIES_HIGH_CORRECT', constant.high === 50);
  check('CONSTANT_SERIES_LOW_CORRECT', constant.low === 50);
  check('CONSTANT_SERIES_BOUNDARIES_EQUAL', constant.high === constant.low);

  const negative = service.calculate({
    values: [-10, -5, -20, -1],
    period: 4,
  });

  check('NEGATIVE_VALUES_HIGH_CORRECT', negative.high === -1);
  check('NEGATIVE_VALUES_LOW_CORRECT', negative.low === -20);

  const decimals = service.calculate({
    values: [1.25, 1.5, 1.1, 1.75, 1.4],
    period: 5,
  });

  check('DECIMAL_HIGH_CORRECT', decimals.high === 1.75);
  check('DECIMAL_LOW_CORRECT', decimals.low === 1.1);

  const values = [5, 10, 3, 12, 8];
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
      values: [10, 20],
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
        values: [10, 20, 30],
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
        values: [10, invalidValue, 30],
        period: 3,
      }),
    );
  }

  const extreme = service.calculate({
    values: [-Number.MAX_VALUE, 0, Number.MAX_VALUE],
    period: 3,
  });

  check('EXTREME_FINITE_HIGH_SUPPORTED', extreme.high === Number.MAX_VALUE);
  check('EXTREME_FINITE_LOW_SUPPORTED', extreme.low === -Number.MAX_VALUE);
  check(
    'EXTREME_RESULTS_FINITE',
    Number.isFinite(extreme.high) && Number.isFinite(extreme.low),
  );

  const deterministicInput = {
    values: [15, 12, 19, 7, 21, 14, 18],
    period: 5,
  };

  const first = service.calculate(deterministicInput);
  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.high === second.high &&
      first.low === second.low &&
      first.period === second.period,
  );

  check('FINAL_HIGH_FINITE', Number.isFinite(first.high));
  check('FINAL_LOW_FINITE', Number.isFinite(first.low));
  check('FINAL_BOUNDARY_INVARIANT', first.high >= first.low);

  check(
    'FINAL_HIGH_EXISTS_IN_WINDOW',
    deterministicInput.values
      .slice(-deterministicInput.period)
      .includes(first.high),
  );

  check(
    'FINAL_LOW_EXISTS_IN_WINDOW',
    deterministicInput.values
      .slice(-deterministicInput.period)
      .includes(first.low),
  );

  console.log('PUNTO 227 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
