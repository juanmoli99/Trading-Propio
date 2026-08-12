import { Injectable } from '@nestjs/common';
import { MARKET_DATA_CACHE_TTL_MS } from './market-data-cache.constants';
import { MarketDataClientService } from './market-data-client.service';
import {
  normalizeLatestQuote,
  type LatestQuoteApiResponse,
} from './market-data.mapper';
import type {
  LatestQuoteRequest,
  LatestQuoteResult,
} from './market-data.types';

@Injectable()
export class LatestQuoteService {
  constructor(private readonly client: MarketDataClientService) {}

  async getLatestQuote(
    request: LatestQuoteRequest,
  ): Promise<LatestQuoteResult> {
    const symbol = this.normalizeSymbol(request.symbol);

    const response = await this.client.request<LatestQuoteApiResponse>({
      cacheTtlMs: MARKET_DATA_CACHE_TTL_MS.LATEST,
      path: `/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest`,
      query: {
        feed: request.feed,
        currency: request.currency,
      },
    });

    return normalizeLatestQuote(response.data, symbol);
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized || normalized.length > 32) {
      throw new Error('Invalid latest quote symbol');
    }

    return normalized;
  }
}
