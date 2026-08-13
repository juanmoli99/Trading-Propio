import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import {
  validateIndicatorPeriod,
  validateIndicatorValues,
} from './indicator-validation';
import type { VolatilityInput, VolatilityResult } from './volatility.types';

@Injectable()
export class VolatilityService implements Indicator<
  VolatilityInput,
  VolatilityResult
> {
  calculate(input: VolatilityInput): VolatilityResult {
    validateIndicatorValues(input.values);
    validateIndicatorPeriod(input.period);

    if (input.values.length < input.period + 1) {
      throw new Error('Volatility requires at least period + 1 values');
    }

    for (const value of input.values) {
      if (value <= 0) {
        throw new Error('Volatility requires strictly positive values');
      }
    }

    const startIndex = input.values.length - input.period - 1;

    const returns: number[] = [];

    for (let index = startIndex + 1; index < input.values.length; index += 1) {
      const previous = input.values[index - 1];

      const current = input.values[index];

      if (previous === undefined || current === undefined) {
        throw new Error('Volatility price sequence is incomplete');
      }

      const simpleReturn = current / previous - 1;

      if (!Number.isFinite(simpleReturn)) {
        throw new Error(
          'Volatility return calculation produced a non-finite result',
        );
      }

      returns.push(simpleReturn);
    }

    if (returns.length !== input.period) {
      throw new Error('Volatility return count is inconsistent');
    }

    let returnSum = 0;

    for (const value of returns) {
      returnSum += value;

      if (!Number.isFinite(returnSum)) {
        throw new Error(
          'Volatility mean calculation produced a non-finite result',
        );
      }
    }

    const meanReturn = returnSum / input.period;

    if (!Number.isFinite(meanReturn)) {
      throw new Error('Volatility mean return is invalid');
    }

    let squaredDeviationSum = 0;

    for (const value of returns) {
      const difference = value - meanReturn;

      const squaredDeviation = difference * difference;

      if (!Number.isFinite(squaredDeviation)) {
        throw new Error(
          'Volatility squared deviation produced a non-finite result',
        );
      }

      squaredDeviationSum += squaredDeviation;

      if (!Number.isFinite(squaredDeviationSum)) {
        throw new Error('Volatility variance sum produced a non-finite result');
      }
    }

    const variance = squaredDeviationSum / input.period;

    if (!Number.isFinite(variance) || variance < 0) {
      throw new Error('Volatility variance produced an invalid result');
    }

    const value = Math.sqrt(variance);

    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Volatility calculation produced an invalid result');
    }

    return {
      value,
      period: input.period,
      meanReturn,
      variance,
    };
  }
}
