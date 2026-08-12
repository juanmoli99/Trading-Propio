import { Injectable } from '@nestjs/common';
import { MARKET_DATA_CACHE_TTL_MS } from './market-data-cache.constants';
import { MarketDataClientService } from './market-data-client.service';
import {
  normalizeLatestTrade,
  type LatestTradeApiResponse,
} from './market-data.mapper';
import type {
  LatestTradeRequest,
  LatestTradeResult,
} from './market-data.types';

@Injectable()
export class LatestTradeService {
  constructor(private readonly client: MarketDataClientService) {}

  async getLatestTrade(
    request: LatestTradeRequest,
  ): Promise<LatestTradeResult> {
    const symbol = this.normalizeSymbol(request.symbol);

    const response = await this.client.request<LatestTradeApiResponse>({
      cacheTtlMs: MARKET_DATA_CACHE_TTL_MS.LATEST,
      path: `/v2/stocks/${encodeURIComponent(symbol)}/trades/latest`,
      query: {
        feed: request.feed,
        currency: request.currency,
      },
    });

    return normalizeLatestTrade(response.data, symbol);
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized || normalized.length > 32) {
      throw new Error('Invalid latest trade symbol');
    }

    return normalized;
  }
}
