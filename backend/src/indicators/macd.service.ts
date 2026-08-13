import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import {
  validateIndicatorPeriod,
  validateIndicatorValues,
} from './indicator-validation';
import type { MacdInput, MacdResult } from './macd.types';

@Injectable()
export class MacdService implements Indicator<MacdInput, MacdResult> {
  calculate(input: MacdInput): MacdResult {
    validateIndicatorValues(input.values);
    validateIndicatorPeriod(input.fastPeriod);
    validateIndicatorPeriod(input.slowPeriod);
    validateIndicatorPeriod(input.signalPeriod);

    if (input.fastPeriod >= input.slowPeriod) {
      throw new Error('MACD fast period must be lower than slow period');
    }

    const minimumValues = input.slowPeriod + input.signalPeriod - 1;

    if (input.values.length < minimumValues) {
      throw new Error(`MACD requires at least ${minimumValues} values`);
    }

    const fastSeries = this.calculateEmaSeries(input.values, input.fastPeriod);

    const slowSeries = this.calculateEmaSeries(input.values, input.slowPeriod);

    const macdSeries: number[] = [];

    for (
      let index = input.slowPeriod - 1;
      index < input.values.length;
      index += 1
    ) {
      const fast = fastSeries[index];
      const slow = slowSeries[index];

      if (fast === undefined || slow === undefined) {
        throw new Error('MACD EMA series is incomplete');
      }

      const value = fast - slow;

      if (!Number.isFinite(value)) {
        throw new Error('MACD line produced a non-finite result');
      }

      macdSeries.push(value);
    }

    if (macdSeries.length < input.signalPeriod) {
      throw new Error(
        'MACD does not have enough values for signal line warm-up',
      );
    }

    const signalSeries = this.calculateEmaSeries(
      macdSeries,
      input.signalPeriod,
    );

    const macd = macdSeries[macdSeries.length - 1];

    const signal = signalSeries[signalSeries.length - 1];

    if (macd === undefined || signal === undefined) {
      throw new Error('MACD final values are unavailable');
    }

    const histogram = macd - signal;

    if (
      !Number.isFinite(macd) ||
      !Number.isFinite(signal) ||
      !Number.isFinite(histogram)
    ) {
      throw new Error('MACD calculation produced a non-finite result');
    }

    return {
      macd,
      signal,
      histogram,
      fastPeriod: input.fastPeriod,
      slowPeriod: input.slowPeriod,
      signalPeriod: input.signalPeriod,
    };
  }

  private calculateEmaSeries(
    values: readonly number[],
    period: number,
  ): Array<number | undefined> {
    if (values.length < period) {
      throw new Error('EMA series does not have enough values');
    }

    const result: Array<number | undefined> = new Array(values.length).fill(
      undefined,
    );

    let seedSum = 0;

    for (let index = 0; index < period; index += 1) {
      seedSum += values[index] as number;

      if (!Number.isFinite(seedSum)) {
        throw new Error('MACD EMA seed produced a non-finite result');
      }
    }

    let ema = seedSum / period;

    if (!Number.isFinite(ema)) {
      throw new Error('MACD EMA seed average produced a non-finite result');
    }

    result[period - 1] = ema;

    const multiplier = 2 / (period + 1);

    if (!Number.isFinite(multiplier)) {
      throw new Error('MACD EMA multiplier is invalid');
    }

    for (let index = period; index < values.length; index += 1) {
      const current = values[index] as number;

      ema = (current - ema) * multiplier + ema;

      if (!Number.isFinite(ema)) {
        throw new Error('MACD EMA calculation produced a non-finite result');
      }

      result[index] = ema;
    }

    return result;
  }
}
