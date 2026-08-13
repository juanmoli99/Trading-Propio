import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validatePeriodIndicatorInput } from './indicator-validation';
import type { EmaInput, EmaResult } from './ema.types';

@Injectable()
export class EmaService implements Indicator<EmaInput, EmaResult> {
  calculate(input: EmaInput): EmaResult {
    validatePeriodIndicatorInput(input.values, input.period);

    const multiplier = 2 / (input.period + 1);

    if (!Number.isFinite(multiplier)) {
      throw new Error('EMA multiplier is invalid');
    }

    let seedSum = 0;

    for (let index = 0; index < input.period; index += 1) {
      seedSum += input.values[index] as number;

      if (!Number.isFinite(seedSum)) {
        throw new Error('EMA seed calculation produced a non-finite result');
      }
    }

    let ema = seedSum / input.period;

    if (!Number.isFinite(ema)) {
      throw new Error('EMA seed calculation produced a non-finite result');
    }

    for (let index = input.period; index < input.values.length; index += 1) {
      const current = input.values[index] as number;

      ema = (current - ema) * multiplier + ema;

      if (!Number.isFinite(ema)) {
        throw new Error('EMA calculation produced a non-finite result');
      }
    }

    return {
      value: ema,
      period: input.period,
      multiplier,
    };
  }
}
