import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validatePeriodIndicatorInput } from './indicator-validation';
import type {
  RollingHighLowInput,
  RollingHighLowResult,
} from './rolling-high-low.types';

@Injectable()
export class RollingHighLowService implements Indicator<
  RollingHighLowInput,
  RollingHighLowResult
> {
  calculate(input: RollingHighLowInput): RollingHighLowResult {
    validatePeriodIndicatorInput(input.values, input.period);

    const startIndex = input.values.length - input.period;

    let high = Number.NEGATIVE_INFINITY;
    let low = Number.POSITIVE_INFINITY;

    for (let index = startIndex; index < input.values.length; index += 1) {
      const value = input.values[index];

      if (value === undefined) {
        throw new Error('Rolling high/low sequence is incomplete');
      }

      if (value > high) {
        high = value;
      }

      if (value < low) {
        low = value;
      }
    }

    if (!Number.isFinite(high) || !Number.isFinite(low)) {
      throw new Error(
        'Rolling high/low calculation produced a non-finite result',
      );
    }

    if (high < low) {
      throw new Error(
        'Rolling high/low calculation produced inconsistent boundaries',
      );
    }

    return {
      high,
      low,
      period: input.period,
    };
  }
}
