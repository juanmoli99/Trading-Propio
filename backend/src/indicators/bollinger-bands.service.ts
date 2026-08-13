import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validatePeriodIndicatorInput } from './indicator-validation';
import type {
  BollingerBandsInput,
  BollingerBandsResult,
} from './bollinger-bands.types';

@Injectable()
export class BollingerBandsService implements Indicator<
  BollingerBandsInput,
  BollingerBandsResult
> {
  calculate(input: BollingerBandsInput): BollingerBandsResult {
    validatePeriodIndicatorInput(input.values, input.period);

    const multiplier = this.validateMultiplier(
      input.standardDeviationMultiplier,
    );

    const startIndex = input.values.length - input.period;

    let sum = 0;

    for (let index = startIndex; index < input.values.length; index += 1) {
      sum += input.values[index] as number;

      if (!Number.isFinite(sum)) {
        throw new Error(
          'Bollinger Bands mean calculation produced a non-finite result',
        );
      }
    }

    const middle = sum / input.period;

    if (!Number.isFinite(middle)) {
      throw new Error('Bollinger Bands middle value is invalid');
    }

    let squaredDeviationSum = 0;

    for (let index = startIndex; index < input.values.length; index += 1) {
      const value = input.values[index] as number;

      const difference = value - middle;

      const squaredDeviation = difference * difference;

      if (!Number.isFinite(squaredDeviation)) {
        throw new Error(
          'Bollinger Bands variance calculation produced a non-finite result',
        );
      }

      squaredDeviationSum += squaredDeviation;

      if (!Number.isFinite(squaredDeviationSum)) {
        throw new Error(
          'Bollinger Bands variance sum produced a non-finite result',
        );
      }
    }

    const variance = squaredDeviationSum / input.period;

    if (!Number.isFinite(variance) || variance < 0) {
      throw new Error('Bollinger Bands variance is invalid');
    }

    const standardDeviation = Math.sqrt(variance);

    if (!Number.isFinite(standardDeviation) || standardDeviation < 0) {
      throw new Error('Bollinger Bands standard deviation is invalid');
    }

    const deviation = standardDeviation * multiplier;

    if (!Number.isFinite(deviation)) {
      throw new Error('Bollinger Bands deviation produced a non-finite result');
    }

    const upper = middle + deviation;

    const lower = middle - deviation;

    if (!Number.isFinite(upper) || !Number.isFinite(lower)) {
      throw new Error(
        'Bollinger Bands boundaries produced a non-finite result',
      );
    }

    if (lower > middle || middle > upper) {
      throw new Error('Bollinger Bands boundaries are inconsistent');
    }

    return {
      middle,
      upper,
      lower,
      standardDeviation,
      period: input.period,
      standardDeviationMultiplier: multiplier,
    };
  }

  private validateMultiplier(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        'Bollinger Bands standard deviation multiplier must be a finite non-negative number',
      );
    }

    return value;
  }
}
