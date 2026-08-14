import { CrossoverService } from '../src/indicators/crossover.service';

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
  const service = new CrossoverService();

  const crossAbove = service.calculate({
    left: [1, 2],
    right: [2, 1],
  });

  check('CROSS_ABOVE_DETECTED', crossAbove.crossed === true);
  check('CROSS_ABOVE_TYPE_CORRECT', crossAbove.type === 'CROSS_ABOVE');
  check('CROSS_ABOVE_PREVIOUS_LEFT_PRESERVED', crossAbove.previousLeft === 1);
  check('CROSS_ABOVE_PREVIOUS_RIGHT_PRESERVED', crossAbove.previousRight === 2);
  check('CROSS_ABOVE_CURRENT_LEFT_PRESERVED', crossAbove.currentLeft === 2);
  check('CROSS_ABOVE_CURRENT_RIGHT_PRESERVED', crossAbove.currentRight === 1);

  const crossBelow = service.calculate({
    left: [2, 1],
    right: [1, 2],
  });

  check('CROSS_BELOW_DETECTED', crossBelow.crossed === true);
  check('CROSS_BELOW_TYPE_CORRECT', crossBelow.type === 'CROSS_BELOW');

  const equalThenAbove = service.calculate({
    left: [10, 11],
    right: [10, 10],
  });

  check('EQUALITY_THEN_ABOVE_IS_CROSS', equalThenAbove.crossed === true);
  check(
    'EQUALITY_THEN_ABOVE_TYPE_CORRECT',
    equalThenAbove.type === 'CROSS_ABOVE',
  );

  const equalThenBelow = service.calculate({
    left: [10, 9],
    right: [10, 10],
  });

  check('EQUALITY_THEN_BELOW_IS_CROSS', equalThenBelow.crossed === true);
  check(
    'EQUALITY_THEN_BELOW_TYPE_CORRECT',
    equalThenBelow.type === 'CROSS_BELOW',
  );

  const aboveNoCross = service.calculate({
    left: [3, 4],
    right: [1, 2],
  });

  check('REMAINS_ABOVE_NOT_CROSS', aboveNoCross.crossed === false);
  check('REMAINS_ABOVE_TYPE_NONE', aboveNoCross.type === 'NONE');

  const belowNoCross = service.calculate({
    left: [1, 2],
    right: [3, 4],
  });

  check('REMAINS_BELOW_NOT_CROSS', belowNoCross.crossed === false);
  check('REMAINS_BELOW_TYPE_NONE', belowNoCross.type === 'NONE');

  const equalNoCross = service.calculate({
    left: [5, 5],
    right: [5, 5],
  });

  check('REMAINS_EQUAL_NOT_CROSS', equalNoCross.crossed === false);
  check('REMAINS_EQUAL_TYPE_NONE', equalNoCross.type === 'NONE');

  const convergesToEqual = service.calculate({
    left: [1, 2],
    right: [3, 2],
  });

  check('CONVERGENCE_TO_EQUAL_NOT_CROSS', convergesToEqual.crossed === false);
  check('CONVERGENCE_TO_EQUAL_TYPE_NONE', convergesToEqual.type === 'NONE');

  const longSeries = service.calculate({
    left: [100, -100, 500, 1, 3],
    right: [-100, 100, -500, 2, 2],
  });

  check('ONLY_LAST_TWO_POINTS_USED', longSeries.type === 'CROSS_ABOVE');
  check(
    'LAST_TWO_PREVIOUS_VALUES_CORRECT',
    longSeries.previousLeft === 1 && longSeries.previousRight === 2,
  );
  check(
    'LAST_TWO_CURRENT_VALUES_CORRECT',
    longSeries.currentLeft === 3 && longSeries.currentRight === 2,
  );

  const negativeValues = service.calculate({
    left: [-10, -1],
    right: [-5, -5],
  });

  check('NEGATIVE_VALUES_SUPPORTED', negativeValues.type === 'CROSS_ABOVE');

  const decimalValues = service.calculate({
    left: [1.25, 1.75],
    right: [1.5, 1.5],
  });

  check('DECIMAL_VALUES_SUPPORTED', decimalValues.type === 'CROSS_ABOVE');

  const left = [1, 2, 3];
  const right = [3, 2, 1];
  const leftSnapshot = [...left];
  const rightSnapshot = [...right];

  service.calculate({
    left,
    right,
  });

  check(
    'LEFT_INPUT_NOT_MUTATED',
    left.length === leftSnapshot.length &&
      left.every((value, index) => value === leftSnapshot[index]),
  );

  check(
    'RIGHT_INPUT_NOT_MUTATED',
    right.length === rightSnapshot.length &&
      right.every((value, index) => value === rightSnapshot[index]),
  );

  expectThrow('EMPTY_LEFT_REJECTED', () =>
    service.calculate({
      left: [],
      right: [],
    }),
  );

  expectThrow('EMPTY_RIGHT_REJECTED', () =>
    service.calculate({
      left: [1, 2],
      right: [],
    }),
  );

  expectThrow('SINGLE_POINT_REJECTED', () =>
    service.calculate({
      left: [1],
      right: [2],
    }),
  );

  expectThrow('MISMATCHED_LENGTH_REJECTED', () =>
    service.calculate({
      left: [1, 2, 3],
      right: [1, 2],
    }),
  );

  for (const invalidValue of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_LEFT_VALUE_REJECTED_${String(invalidValue)}`, () =>
      service.calculate({
        left: [1, invalidValue],
        right: [2, 2],
      }),
    );

    expectThrow(`INVALID_RIGHT_VALUE_REJECTED_${String(invalidValue)}`, () =>
      service.calculate({
        left: [1, 2],
        right: [2, invalidValue],
      }),
    );
  }

  const extremeAbove = service.calculate({
    left: [-Number.MAX_VALUE, Number.MAX_VALUE],
    right: [Number.MAX_VALUE, -Number.MAX_VALUE],
  });

  check(
    'EXTREME_FINITE_CROSS_ABOVE_SUPPORTED',
    extremeAbove.type === 'CROSS_ABOVE',
  );

  const extremeBelow = service.calculate({
    left: [Number.MAX_VALUE, -Number.MAX_VALUE],
    right: [-Number.MAX_VALUE, Number.MAX_VALUE],
  });

  check(
    'EXTREME_FINITE_CROSS_BELOW_SUPPORTED',
    extremeBelow.type === 'CROSS_BELOW',
  );

  const deterministicInput = {
    left: [10, 11, 12, 9, 15],
    right: [8, 9, 10, 10, 11],
  };

  const first = service.calculate(deterministicInput);
  const second = service.calculate(deterministicInput);

  check(
    'REPEATED_CALCULATION_DETERMINISTIC',
    first.type === second.type &&
      first.crossed === second.crossed &&
      first.previousLeft === second.previousLeft &&
      first.previousRight === second.previousRight &&
      first.currentLeft === second.currentLeft &&
      first.currentRight === second.currentRight,
  );

  check('CROSSED_TYPE_INVARIANT', first.crossed === (first.type !== 'NONE'));

  check(
    'RESULT_VALUES_FINITE',
    Number.isFinite(first.previousLeft) &&
      Number.isFinite(first.previousRight) &&
      Number.isFinite(first.currentLeft) &&
      Number.isFinite(first.currentRight),
  );

  console.log('PUNTO 228 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

