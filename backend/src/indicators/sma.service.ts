import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validatePeriodIndicatorInput } from './indicator-validation';
import type { SmaInput, SmaResult } from './sma.types';

@Injectable()
export class SmaService implements Indicator<SmaInput, SmaResult> {
  calculate(input: SmaInput): SmaResult {
    validatePeriodIndicatorInput(input.values, input.period);

    const startIndex = input.values.length - input.period;

    let sum = 0;

    for (let index = startIndex; index < input.values.length; index += 1) {
      sum += input.values[index] as number;
    }

    const value = sum / input.period;

    if (!Number.isFinite(value)) {
      throw new Error('SMA calculation produced a non-finite result');
    }

    return {
      value,
      period: input.period,
    };
  }
}
