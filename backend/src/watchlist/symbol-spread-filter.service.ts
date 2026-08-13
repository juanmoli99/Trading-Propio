import { Injectable } from '@nestjs/common';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  SymbolSpreadFilterQuery,
  SymbolSpreadFilterResult,
} from './symbol-spread-filter.types';

@Injectable()
export class SymbolSpreadFilterService {
  evaluate(query: SymbolSpreadFilterQuery): SymbolSpreadFilterResult {
    const symbol = normalizeTradingSymbol(query.symbol);

    const maximumSpreadPercent = this.requireValidMaximumSpreadPercent(
      query.maximumSpreadPercent,
    );

    if (!Number.isFinite(query.bidPrice) || query.bidPrice <= 0) {
      return {
        symbol,
        bidPrice: query.bidPrice,
        askPrice: query.askPrice,
        midpoint: null,
        spread: null,
        spreadPercent: null,
        maximumSpreadPercent,
        allowed: false,
        status: 'INVALID_BID',
        reason: 'Bid price is unavailable, non-finite, or non-positive',
      };
    }

    if (!Number.isFinite(query.askPrice) || query.askPrice <= 0) {
      return {
        symbol,
        bidPrice: query.bidPrice,
        askPrice: query.askPrice,
        midpoint: null,
        spread: null,
        spreadPercent: null,
        maximumSpreadPercent,
        allowed: false,
        status: 'INVALID_ASK',
        reason: 'Ask price is unavailable, non-finite, or non-positive',
      };
    }

    if (query.askPrice < query.bidPrice) {
      return {
        symbol,
        bidPrice: query.bidPrice,
        askPrice: query.askPrice,
        midpoint: null,
        spread: null,
        spreadPercent: null,
        maximumSpreadPercent,
        allowed: false,
        status: 'INVALID_MARKET',
        reason: 'Ask price is below bid price',
      };
    }

    const midpoint = (query.bidPrice + query.askPrice) / 2;

    const spread = query.askPrice - query.bidPrice;

    const spreadPercent = (spread / midpoint) * 100;

    if (
      !Number.isFinite(midpoint) ||
      midpoint <= 0 ||
      !Number.isFinite(spread) ||
      spread < 0 ||
      !Number.isFinite(spreadPercent) ||
      spreadPercent < 0
    ) {
      return {
        symbol,
        bidPrice: query.bidPrice,
        askPrice: query.askPrice,
        midpoint: null,
        spread: null,
        spreadPercent: null,
        maximumSpreadPercent,
        allowed: false,
        status: 'INVALID_SPREAD',
        reason: 'Spread could not be calculated safely',
      };
    }

    if (spreadPercent > maximumSpreadPercent) {
      return {
        symbol,
        bidPrice: query.bidPrice,
        askPrice: query.askPrice,
        midpoint,
        spread,
        spreadPercent,
        maximumSpreadPercent,
        allowed: false,
        status: 'SPREAD_ABOVE_MAXIMUM',
        reason: 'Bid/ask spread exceeds the configured maximum',
      };
    }

    return {
      symbol,
      bidPrice: query.bidPrice,
      askPrice: query.askPrice,
      midpoint,
      spread,
      spreadPercent,
      maximumSpreadPercent,
      allowed: true,
      status: 'ALLOWED',
      reason: 'Bid/ask spread is within the configured maximum',
    };
  }

  assertAllowed(query: SymbolSpreadFilterQuery): void {
    const result = this.evaluate(query);

    if (result.allowed) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} failed spread filter: ${result.status} - ${result.reason}`,
    );
  }

  private requireValidMaximumSpreadPercent(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Invalid symbol spread filter maximum spread percent');
    }

    return value;
  }
}
