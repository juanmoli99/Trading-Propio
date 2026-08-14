import type {
  Indicator,
  IndicatorInput,
  IndicatorResult,
} from '../src/indicators/indicator.interface';
import type {
  NumericIndicatorResult,
  PeriodIndicatorInput,
} from '../src/indicators/indicator.types';
import {
  validateIndicatorPeriod,
  validateIndicatorValues,
  validatePeriodIndicatorInput,
} from '../src/indicators/indicator-validation';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectThrow(callback: () => void): boolean {
  try {
    callback();
    return false;
  } catch {
    return true;
  }
}

class TestIndicator implements Indicator<
  PeriodIndicatorInput,
  NumericIndicatorResult
> {
  calculate(input: PeriodIndicatorInput): NumericIndicatorResult {
    validatePeriodIndicatorInput(input.values, input.period);

    const selectedValues = input.values.slice(-input.period);

    const total = selectedValues.reduce((sum, value) => sum + value, 0);

    return {
      value: total / input.period,
    };
  }
}

function main(): void {
  const genericInput: IndicatorInput = {
    values: [1, 2, 3],
  };

  const genericResult: IndicatorResult<number> = {
    value: 2,
  };

  check('GENERIC_INPUT_CONTRACT_EXISTS', genericInput.values.length === 3);

  check('GENERIC_RESULT_CONTRACT_EXISTS', genericResult.value === 2);

  const indicator: Indicator<PeriodIndicatorInput, NumericIndicatorResult> =
    new TestIndicator();

  const result = indicator.calculate({
    values: [1, 2, 3, 4, 5],
    period: 3,
  });

  check('COMMON_INDICATOR_INTERFACE_WORKS', result.value === 4);

  check(
    'VALUES_VALIDATION_ACCEPTS_FINITE_NUMBERS',
    validateIndicatorValues([1, 2, 3]).length === 3,
  );

  check(
    'VALUES_VALIDATION_REJECTS_EMPTY_ARRAY',
    expectThrow(() => validateIndicatorValues([])),
  );

  check(
    'VALUES_VALIDATION_REJECTS_NAN',
    expectThrow(() => validateIndicatorValues([1, Number.NaN])),
  );

  check(
    'VALUES_VALIDATION_REJECTS_POSITIVE_INFINITY',
    expectThrow(() => validateIndicatorValues([1, Number.POSITIVE_INFINITY])),
  );

  check(
    'VALUES_VALIDATION_REJECTS_NEGATIVE_INFINITY',
    expectThrow(() => validateIndicatorValues([1, Number.NEGATIVE_INFINITY])),
  );

  check(
    'PERIOD_VALIDATION_ACCEPTS_POSITIVE_INTEGER',
    validateIndicatorPeriod(14) === 14,
  );

  for (const invalidPeriod of [
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ]) {
    check(
      `INVALID_PERIOD_REJECTED_${String(invalidPeriod)}`,
      expectThrow(() => validateIndicatorPeriod(invalidPeriod)),
    );
  }

  check(
    'SUFFICIENT_VALUES_ACCEPTED',
    !expectThrow(() => validatePeriodIndicatorInput([1, 2, 3], 3)),
  );

  check(
    'INSUFFICIENT_VALUES_REJECTED',
    expectThrow(() => validatePeriodIndicatorInput([1, 2], 3)),
  );

  const repeatedResult = indicator.calculate({
    values: [1, 2, 3, 4, 5],
    period: 3,
  });

  check('CALCULATION_DETERMINISTIC', repeatedResult.value === result.value);

  console.log('PUNTO 211 VERIFICADO CORRECTAMENTE.');
}

try {
  main();
  console.log('EXIT_CODE: 0');
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

