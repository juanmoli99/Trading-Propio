import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validateIndicatorPeriod } from './indicator-validation';
import type { AdxInput, AdxResult } from './adx.types';

interface DirectionalPoint {
  readonly trueRange: number;
  readonly plusDm: number;
  readonly minusDm: number;
}

@Injectable()
export class AdxService implements Indicator<AdxInput, AdxResult> {
  calculate(input: AdxInput): AdxResult {
    validateIndicatorPeriod(input.period);
    this.validateBars(input.bars);

    const minimumBars = input.period * 2 + 1;

    if (input.bars.length < minimumBars) {
      throw new Error(`ADX requires at least ${minimumBars} bars`);
    }

    const directionalPoints = this.calculateDirectionalPoints(input.bars);

    let smoothedTr = 0;
    let smoothedPlusDm = 0;
    let smoothedMinusDm = 0;

    for (let index = 0; index < input.period; index += 1) {
      const point = directionalPoints[index];

      if (point === undefined) {
        throw new Error('ADX directional data is incomplete');
      }

      smoothedTr += point.trueRange;
      smoothedPlusDm += point.plusDm;
      smoothedMinusDm += point.minusDm;

      this.assertFiniteSmoothedValues(
        smoothedTr,
        smoothedPlusDm,
        smoothedMinusDm,
      );
    }

    const dxValues: number[] = [];

    let latestPlusDi = 0;
    let latestMinusDi = 0;
    let latestDx = 0;

    const firstDirectional = this.calculateDirectionalIndexes(
      smoothedTr,
      smoothedPlusDm,
      smoothedMinusDm,
    );

    latestPlusDi = firstDirectional.plusDi;

    latestMinusDi = firstDirectional.minusDi;

    latestDx = firstDirectional.dx;

    dxValues.push(latestDx);

    for (
      let index = input.period;
      index < directionalPoints.length;
      index += 1
    ) {
      const point = directionalPoints[index];

      if (point === undefined) {
        throw new Error('ADX directional data is incomplete');
      }

      smoothedTr = smoothedTr - smoothedTr / input.period + point.trueRange;

      smoothedPlusDm =
        smoothedPlusDm - smoothedPlusDm / input.period + point.plusDm;

      smoothedMinusDm =
        smoothedMinusDm - smoothedMinusDm / input.period + point.minusDm;

      this.assertFiniteSmoothedValues(
        smoothedTr,
        smoothedPlusDm,
        smoothedMinusDm,
      );

      const directional = this.calculateDirectionalIndexes(
        smoothedTr,
        smoothedPlusDm,
        smoothedMinusDm,
      );

      latestPlusDi = directional.plusDi;

      latestMinusDi = directional.minusDi;

      latestDx = directional.dx;

      dxValues.push(latestDx);
    }

    if (dxValues.length < input.period + 1) {
      throw new Error('ADX does not have enough DX values after warm-up');
    }

    let initialAdxSum = 0;

    for (let index = 0; index < input.period; index += 1) {
      initialAdxSum += dxValues[index] as number;

      if (!Number.isFinite(initialAdxSum)) {
        throw new Error('ADX initial sum produced a non-finite result');
      }
    }

    let adx = initialAdxSum / input.period;

    if (!Number.isFinite(adx) || adx < 0 || adx > 100) {
      throw new Error('ADX initial value is invalid');
    }

    for (let index = input.period; index < dxValues.length; index += 1) {
      adx =
        (adx * (input.period - 1) + (dxValues[index] as number)) / input.period;

      if (!Number.isFinite(adx) || adx < 0 || adx > 100) {
        throw new Error('ADX calculation produced an invalid result');
      }
    }

    return {
      adx,
      plusDi: latestPlusDi,
      minusDi: latestMinusDi,
      dx: latestDx,
      period: input.period,
    };
  }

  private calculateDirectionalPoints(
    bars: readonly AdxInput['bars'][number][],
  ): DirectionalPoint[] {
    const result: DirectionalPoint[] = [];

    for (let index = 1; index < bars.length; index += 1) {
      const previous = bars[index - 1];

      const current = bars[index];

      if (previous === undefined || current === undefined) {
        throw new Error('ADX bar sequence is incomplete');
      }

      const upwardMove = current.high - previous.high;

      const downwardMove = previous.low - current.low;

      if (!Number.isFinite(upwardMove) || !Number.isFinite(downwardMove)) {
        throw new Error(
          'ADX directional movement produced a non-finite result',
        );
      }

      const plusDm =
        upwardMove > downwardMove && upwardMove > 0 ? upwardMove : 0;

      const minusDm =
        downwardMove > upwardMove && downwardMove > 0 ? downwardMove : 0;

      const trueRange = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      );

      if (
        !Number.isFinite(trueRange) ||
        trueRange < 0 ||
        !Number.isFinite(plusDm) ||
        plusDm < 0 ||
        !Number.isFinite(minusDm) ||
        minusDm < 0
      ) {
        throw new Error('ADX directional point is invalid');
      }

      result.push({
        trueRange,
        plusDm,
        minusDm,
      });
    }

    return result;
  }

  private calculateDirectionalIndexes(
    smoothedTr: number,
    smoothedPlusDm: number,
    smoothedMinusDm: number,
  ): {
    readonly plusDi: number;
    readonly minusDi: number;
    readonly dx: number;
  } {
    if (smoothedTr === 0) {
      return {
        plusDi: 0,
        minusDi: 0,
        dx: 0,
      };
    }

    const plusDi = (100 * smoothedPlusDm) / smoothedTr;

    const minusDi = (100 * smoothedMinusDm) / smoothedTr;

    if (
      !Number.isFinite(plusDi) ||
      plusDi < 0 ||
      !Number.isFinite(minusDi) ||
      minusDi < 0
    ) {
      throw new Error('ADX directional indexes are invalid');
    }

    const denominator = plusDi + minusDi;

    const dx =
      denominator === 0 ? 0 : (100 * Math.abs(plusDi - minusDi)) / denominator;

    if (!Number.isFinite(dx) || dx < 0 || dx > 100) {
      throw new Error('ADX DX value is invalid');
    }

    return {
      plusDi,
      minusDi,
      dx,
    };
  }

  private assertFiniteSmoothedValues(
    smoothedTr: number,
    smoothedPlusDm: number,
    smoothedMinusDm: number,
  ): void {
    if (
      !Number.isFinite(smoothedTr) ||
      smoothedTr < 0 ||
      !Number.isFinite(smoothedPlusDm) ||
      smoothedPlusDm < 0 ||
      !Number.isFinite(smoothedMinusDm) ||
      smoothedMinusDm < 0
    ) {
      throw new Error('ADX smoothed values are invalid');
    }
  }

  private validateBars(bars: readonly AdxInput['bars'][number][]): void {
    if (!Array.isArray(bars)) {
      throw new Error('ADX bars must be an array');
    }

    if (bars.length === 0) {
      throw new Error('ADX bars must not be empty');
    }

    for (const bar of bars) {
      if (
        !Number.isFinite(bar.high) ||
        !Number.isFinite(bar.low) ||
        !Number.isFinite(bar.close)
      ) {
        throw new Error(
          'ADX bars must contain finite high, low and close values',
        );
      }

      if (bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
        throw new Error(
          'ADX bars must contain positive high, low and close values',
        );
      }

      if (bar.high < bar.low) {
        throw new Error('ADX bar high cannot be below low');
      }

      if (bar.close > bar.high || bar.close < bar.low) {
        throw new Error('ADX bar close must be inside high-low range');
      }
    }
  }
}
