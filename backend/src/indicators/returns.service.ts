import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validateIndicatorValues } from './indicator-validation';
import type { ReturnsInput, ReturnsResult } from './returns.types';

@Injectable()
export class ReturnsService implements Indicator<ReturnsInput, ReturnsResult> {
  calculate(input: ReturnsInput): ReturnsResult {
    validateIndicatorValues(input.values);

    if (input.values.length < 2) {
      throw new Error('Returns calculation requires at least two values');
    }

    for (const value of input.values) {
      if (value <= 0) {
        throw new Error(
          'Returns calculation requires strictly positive values',
        );
      }
    }

    const returns: number[] = [];

    for (let index = 1; index < input.values.length; index += 1) {
      const previous = input.values[index - 1];

      const current = input.values[index];

      if (previous === undefined || current === undefined) {
        throw new Error('Returns price sequence is incomplete');
      }

      const value = current / previous - 1;

      if (!Number.isFinite(value)) {
        throw new Error('Returns calculation produced a non-finite result');
      }

      returns.push(value);
    }

    const latest = returns[returns.length - 1];

    if (latest === undefined) {
      throw new Error('Returns calculation produced no results');
    }

    return {
      values: returns,
      latest,
    };
  }
}
