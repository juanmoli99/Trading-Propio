export function validateIndicatorValues(
  values: readonly number[],
): readonly number[] {
  if (!Array.isArray(values)) {
    throw new Error('Indicator values must be an array');
  }

  if (values.length === 0) {
    throw new Error('Indicator values must not be empty');
  }

  for (const value of values) {
    if (!Number.isFinite(value)) {
      throw new Error('Indicator values must contain only finite numbers');
    }
  }

  return values;
}

export function validateIndicatorPeriod(period: number): number {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error('Indicator period must be a positive integer');
  }

  return period;
}

export function validatePeriodIndicatorInput(
  values: readonly number[],
  period: number,
): void {
  validateIndicatorValues(values);
  validateIndicatorPeriod(period);

  if (values.length < period) {
    throw new Error(
      'Indicator values length must be greater than or equal to period',
    );
  }
}
