import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import {
  validateIndicatorPeriod,
  validateIndicatorValues,
} from './indicator-validation';
import type { RsiInput, RsiResult } from './rsi.types';

@Injectable()
export class RsiService implements Indicator<RsiInput, RsiResult> {
  calculate(input: RsiInput): RsiResult {
    validateIndicatorValues(input.values);
    validateIndicatorPeriod(input.period);

    if (input.values.length < input.period + 1) {
      throw new Error('RSI requires at least period + 1 values');
    }

    let gainSum = 0;
    let lossSum = 0;

    for (let index = 1; index <= input.period; index += 1) {
      const change =
        (input.values[index] as number) - (input.values[index - 1] as number);

      if (!Number.isFinite(change)) {
        throw new Error('RSI price change produced a non-finite result');
      }

      if (change > 0) {
        gainSum += change;
      } else if (change < 0) {
        lossSum += -change;
      }

      if (!Number.isFinite(gainSum) || !Number.isFinite(lossSum)) {
        throw new Error('RSI initial averages produced a non-finite result');
      }
    }

    let averageGain = gainSum / input.period;

    let averageLoss = lossSum / input.period;

    this.assertFiniteAverages(averageGain, averageLoss);

    for (
      let index = input.period + 1;
      index < input.values.length;
      index += 1
    ) {
      const change =
        (input.values[index] as number) - (input.values[index - 1] as number);

      if (!Number.isFinite(change)) {
        throw new Error('RSI price change produced a non-finite result');
      }

      const gain = change > 0 ? change : 0;

      const loss = change < 0 ? -change : 0;

      averageGain = (averageGain * (input.period - 1) + gain) / input.period;

      averageLoss = (averageLoss * (input.period - 1) + loss) / input.period;

      this.assertFiniteAverages(averageGain, averageLoss);
    }

    const value = this.calculateRsiValue(averageGain, averageLoss);

    return {
      value,
      period: input.period,
      averageGain,
      averageLoss,
    };
  }

  private calculateRsiValue(averageGain: number, averageLoss: number): number {
    if (averageGain === 0 && averageLoss === 0) {
      return 50;
    }

    if (averageLoss === 0) {
      return 100;
    }

    if (averageGain === 0) {
      return 0;
    }

    const relativeStrength = averageGain / averageLoss;

    if (!Number.isFinite(relativeStrength)) {
      throw new Error('RSI relative strength produced a non-finite result');
    }

    const rsi = 100 - 100 / (1 + relativeStrength);

    if (!Number.isFinite(rsi) || rsi < 0 || rsi > 100) {
      throw new Error('RSI calculation produced an invalid result');
    }

    return rsi;
  }

  private assertFiniteAverages(averageGain: number, averageLoss: number): void {
    if (
      !Number.isFinite(averageGain) ||
      averageGain < 0 ||
      !Number.isFinite(averageLoss) ||
      averageLoss < 0
    ) {
      throw new Error('RSI averages produced an invalid result');
    }
  }
}
