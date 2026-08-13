import { Injectable } from '@nestjs/common';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  SymbolVolumeFilterQuery,
  SymbolVolumeFilterResult,
} from './symbol-volume-filter.types';

@Injectable()
export class SymbolVolumeFilterService {
  evaluate(query: SymbolVolumeFilterQuery): SymbolVolumeFilterResult {
    const symbol = normalizeTradingSymbol(query.symbol);

    const minimumVolume = this.requireValidMinimumVolume(query.minimumVolume);

    const volume = query.volume;

    if (
      volume === null ||
      !Number.isFinite(volume) ||
      !Number.isInteger(volume) ||
      volume < 0
    ) {
      return {
        symbol,
        volume,
        minimumVolume,
        allowed: false,
        status: 'INVALID_VOLUME',
        reason:
          'Current volume is unavailable, non-finite, negative, or non-integer',
      };
    }

    if (volume < minimumVolume) {
      return {
        symbol,
        volume,
        minimumVolume,
        allowed: false,
        status: 'VOLUME_BELOW_MINIMUM',
        reason: 'Current volume is below the configured minimum',
      };
    }

    return {
      symbol,
      volume,
      minimumVolume,
      allowed: true,
      status: 'ALLOWED',
      reason: 'Current volume meets the configured minimum',
    };
  }

  assertAllowed(query: SymbolVolumeFilterQuery): void {
    const result = this.evaluate(query);

    if (result.allowed) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} failed volume filter: ${result.status} - ${result.reason}`,
    );
  }

  private requireValidMinimumVolume(value: number): number {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      throw new Error('Invalid symbol volume filter minimum volume');
    }

    return value;
  }
}
