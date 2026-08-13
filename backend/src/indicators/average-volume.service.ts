import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validateIndicatorPeriod } from './indicator-validation';
import type {
  AverageVolumeInput,
  AverageVolumeResult,
} from './average-volume.types';

@Injectable()
export class AverageVolumeService implements Indicator<
  AverageVolumeInput,
  AverageVolumeResult
> {
  calculate(input: AverageVolumeInput): AverageVolumeResult {
    validateIndicatorPeriod(input.period);
    this.validateBars(input.bars);

    if (input.bars.length < input.period) {
      throw new Error('Average volume requires at least period bars');
    }

    const startIndex = input.bars.length - input.period;

    let totalVolume = 0;

    for (let index = startIndex; index < input.bars.length; index += 1) {
      const bar = input.bars[index];

      if (bar === undefined) {
        throw new Error('Average volume bar sequence is incomplete');
      }

      totalVolume += bar.volume;

      if (!Number.isSafeInteger(totalVolume) || totalVolume < 0) {
        throw new Error('Average volume total produced an invalid result');
      }
    }

    const value = totalVolume / input.period;

    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Average volume calculation produced an invalid result');
    }

    return {
      value,
      period: input.period,
      totalVolume,
    };
  }

  private validateBars(
    bars: readonly AverageVolumeInput['bars'][number][],
  ): void {
    if (!Array.isArray(bars)) {
      throw new Error('Average volume bars must be an array');
    }

    if (bars.length === 0) {
      throw new Error('Average volume bars must not be empty');
    }

    for (const bar of bars) {
      if (!Number.isSafeInteger(bar.volume) || bar.volume < 0) {
        throw new Error(
          'Average volume bars must contain non-negative safe integer volume',
        );
      }
    }
  }
}
