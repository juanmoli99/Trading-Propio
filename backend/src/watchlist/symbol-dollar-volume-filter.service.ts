import { Injectable } from '@nestjs/common';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  SymbolDollarVolumeFilterQuery,
  SymbolDollarVolumeFilterResult,
} from './symbol-dollar-volume-filter.types';

@Injectable()
export class SymbolDollarVolumeFilterService {
  evaluate(
    query: SymbolDollarVolumeFilterQuery,
  ): SymbolDollarVolumeFilterResult {
    const symbol = normalizeTradingSymbol(query.symbol);

    const minimumDollarVolume = this.requireValidMinimumDollarVolume(
      query.minimumDollarVolume,
    );

    if (!Number.isFinite(query.price) || query.price <= 0) {
      return {
        symbol,
        price: query.price,
        volume: query.volume,
        dollarVolume: null,
        minimumDollarVolume,
        allowed: false,
        status: 'INVALID_PRICE',
        reason: 'Current price is unavailable, non-finite, or non-positive',
      };
    }

    if (
      query.volume === null ||
      !Number.isFinite(query.volume) ||
      !Number.isInteger(query.volume) ||
      query.volume < 0
    ) {
      return {
        symbol,
        price: query.price,
        volume: query.volume,
        dollarVolume: null,
        minimumDollarVolume,
        allowed: false,
        status: 'INVALID_VOLUME',
        reason:
          'Current volume is unavailable, non-finite, negative, or non-integer',
      };
    }

    const dollarVolume = query.price * query.volume;

    if (!Number.isFinite(dollarVolume) || dollarVolume < 0) {
      return {
        symbol,
        price: query.price,
        volume: query.volume,
        dollarVolume: null,
        minimumDollarVolume,
        allowed: false,
        status: 'INVALID_DOLLAR_VOLUME',
        reason: 'Dollar volume could not be calculated safely',
      };
    }

    if (dollarVolume < minimumDollarVolume) {
      return {
        symbol,
        price: query.price,
        volume: query.volume,
        dollarVolume,
        minimumDollarVolume,
        allowed: false,
        status: 'DOLLAR_VOLUME_BELOW_MINIMUM',
        reason: 'Dollar volume is below the configured minimum',
      };
    }

    return {
      symbol,
      price: query.price,
      volume: query.volume,
      dollarVolume,
      minimumDollarVolume,
      allowed: true,
      status: 'ALLOWED',
      reason: 'Dollar volume meets the configured minimum',
    };
  }

  assertAllowed(query: SymbolDollarVolumeFilterQuery): void {
    const result = this.evaluate(query);

    if (result.allowed) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} failed dollar volume filter: ${result.status} - ${result.reason}`,
    );
  }

  private requireValidMinimumDollarVolume(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        'Invalid symbol dollar volume filter minimum dollar volume',
      );
    }

    return value;
  }
}
