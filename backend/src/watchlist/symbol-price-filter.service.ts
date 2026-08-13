import { Injectable } from '@nestjs/common';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  SymbolPriceFilterQuery,
  SymbolPriceFilterResult,
} from './symbol-price-filter.types';

@Injectable()
export class SymbolPriceFilterService {
  evaluate(query: SymbolPriceFilterQuery): SymbolPriceFilterResult {
    const symbol = normalizeTradingSymbol(query.symbol);

    const minimumPrice = this.requirePositiveFiniteNumber(
      query.minimumPrice,
      'minimum price',
    );

    const maximumPrice = this.requirePositiveFiniteNumber(
      query.maximumPrice,
      'maximum price',
    );

    if (maximumPrice < minimumPrice) {
      throw new Error(
        'Symbol price filter maximum price must be greater than or equal to minimum price',
      );
    }

    const price = query.price;

    if (!Number.isFinite(price) || price <= 0) {
      return {
        symbol,
        price,
        minimumPrice,
        maximumPrice,
        allowed: false,
        status: 'INVALID_PRICE',
        reason: 'Current price is unavailable, non-finite, or non-positive',
      };
    }

    if (price < minimumPrice) {
      return {
        symbol,
        price,
        minimumPrice,
        maximumPrice,
        allowed: false,
        status: 'PRICE_BELOW_MINIMUM',
        reason: 'Current price is below the configured minimum',
      };
    }

    if (price > maximumPrice) {
      return {
        symbol,
        price,
        minimumPrice,
        maximumPrice,
        allowed: false,
        status: 'PRICE_ABOVE_MAXIMUM',
        reason: 'Current price is above the configured maximum',
      };
    }

    return {
      symbol,
      price,
      minimumPrice,
      maximumPrice,
      allowed: true,
      status: 'ALLOWED',
      reason: 'Current price is within the configured range',
    };
  }

  assertAllowed(query: SymbolPriceFilterQuery): void {
    const result = this.evaluate(query);

    if (result.allowed) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} failed price filter: ${result.status} - ${result.reason}`,
    );
  }

  private requirePositiveFiniteNumber(value: number, field: string): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid symbol price filter ${field}`);
    }

    return value;
  }
}
