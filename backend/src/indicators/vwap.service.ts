import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import type { VwapInput, VwapResult } from './vwap.types';

@Injectable()
export class VwapService implements Indicator<VwapInput, VwapResult> {
  calculate(input: VwapInput): VwapResult {
    this.validateBars(input.bars);

    let cumulativeVolume = 0;
    let cumulativePriceVolume = 0;

    for (const bar of input.bars) {
      const typicalPrice = (bar.high + bar.low + bar.close) / 3;

      if (!Number.isFinite(typicalPrice) || typicalPrice <= 0) {
        throw new Error('VWAP typical price produced an invalid result');
      }

      const priceVolume = typicalPrice * bar.volume;

      if (!Number.isFinite(priceVolume)) {
        throw new Error(
          'VWAP price-volume calculation produced a non-finite result',
        );
      }

      cumulativeVolume += bar.volume;

      if (!Number.isSafeInteger(cumulativeVolume) || cumulativeVolume < 0) {
        throw new Error('VWAP cumulative volume produced an invalid result');
      }

      cumulativePriceVolume += priceVolume;

      if (!Number.isFinite(cumulativePriceVolume)) {
        throw new Error(
          'VWAP cumulative price-volume produced a non-finite result',
        );
      }
    }

    if (cumulativeVolume === 0) {
      throw new Error('VWAP requires positive cumulative volume');
    }

    const value = cumulativePriceVolume / cumulativeVolume;

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('VWAP calculation produced an invalid result');
    }

    return {
      value,
      cumulativeVolume,
      cumulativePriceVolume,
    };
  }

  private validateBars(bars: readonly VwapInput['bars'][number][]): void {
    if (!Array.isArray(bars)) {
      throw new Error('VWAP bars must be an array');
    }

    if (bars.length === 0) {
      throw new Error('VWAP bars must not be empty');
    }

    for (const bar of bars) {
      if (
        !Number.isFinite(bar.high) ||
        !Number.isFinite(bar.low) ||
        !Number.isFinite(bar.close)
      ) {
        throw new Error(
          'VWAP bars must contain finite high, low and close values',
        );
      }

      if (bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
        throw new Error(
          'VWAP bars must contain positive high, low and close values',
        );
      }

      if (bar.high < bar.low) {
        throw new Error('VWAP bar high cannot be below low');
      }

      if (bar.close > bar.high || bar.close < bar.low) {
        throw new Error('VWAP bar close must be inside high-low range');
      }

      if (!Number.isSafeInteger(bar.volume) || bar.volume < 0) {
        throw new Error('VWAP bar volume must be a non-negative safe integer');
      }
    }
  }
}
