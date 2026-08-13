import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validateIndicatorPeriod } from './indicator-validation';
import type { AtrInput, AtrResult } from './atr.types';

@Injectable()
export class AtrService implements Indicator<AtrInput, AtrResult> {
  calculate(input: AtrInput): AtrResult {
    validateIndicatorPeriod(input.period);
    this.validateBars(input.bars);

    if (input.bars.length < input.period + 1) {
      throw new Error('ATR requires at least period + 1 bars');
    }

    const trueRanges = this.calculateTrueRanges(input.bars);

    let initialSum = 0;

    for (let index = 0; index < input.period; index += 1) {
      initialSum += trueRanges[index] as number;

      if (!Number.isFinite(initialSum)) {
        throw new Error(
          'ATR initial true range sum produced a non-finite result',
        );
      }
    }

    let atr = initialSum / input.period;

    if (!Number.isFinite(atr) || atr < 0) {
      throw new Error('ATR initial average produced an invalid result');
    }

    for (let index = input.period; index < trueRanges.length; index += 1) {
      atr =
        (atr * (input.period - 1) + (trueRanges[index] as number)) /
        input.period;

      if (!Number.isFinite(atr) || atr < 0) {
        throw new Error('ATR calculation produced an invalid result');
      }
    }

    const lastTrueRange = trueRanges[trueRanges.length - 1] as number;

    return {
      value: atr,
      period: input.period,
      trueRange: lastTrueRange,
    };
  }

  private calculateTrueRanges(
    bars: readonly AtrInput['bars'][number][],
  ): number[] {
    const trueRanges: number[] = [];

    for (let index = 1; index < bars.length; index += 1) {
      const current = bars[index] as AtrInput['bars'][number];

      const previous = bars[index - 1] as AtrInput['bars'][number];

      const highLow = current.high - current.low;

      const highPreviousClose = Math.abs(current.high - previous.close);

      const lowPreviousClose = Math.abs(current.low - previous.close);

      const trueRange = Math.max(highLow, highPreviousClose, lowPreviousClose);

      if (!Number.isFinite(trueRange) || trueRange < 0) {
        throw new Error(
          'ATR true range calculation produced an invalid result',
        );
      }

      trueRanges.push(trueRange);
    }

    return trueRanges;
  }

  private validateBars(bars: readonly AtrInput['bars'][number][]): void {
    if (!Array.isArray(bars)) {
      throw new Error('ATR bars must be an array');
    }

    if (bars.length === 0) {
      throw new Error('ATR bars must not be empty');
    }

    for (const bar of bars) {
      if (
        !Number.isFinite(bar.high) ||
        !Number.isFinite(bar.low) ||
        !Number.isFinite(bar.close)
      ) {
        throw new Error(
          'ATR bars must contain finite high, low and close values',
        );
      }

      if (bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
        throw new Error(
          'ATR bars must contain positive high, low and close values',
        );
      }

      if (bar.high < bar.low) {
        throw new Error('ATR bar high cannot be below low');
      }

      if (bar.close > bar.high || bar.close < bar.low) {
        throw new Error('ATR bar close must be inside high-low range');
      }
    }
  }
}
