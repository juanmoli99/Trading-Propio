import { Injectable } from '@nestjs/common';
import { MARKET_DATA_CACHE_TTL_MS } from './market-data-cache.constants';
import { MarketDataClientService } from './market-data-client.service';
import { MarketDataFutureBarsService } from './market-data-future-bars.service';
import {
  normalizeLatestBar,
  type LatestBarApiResponse,
} from './market-data.mapper';
import type { LatestBarRequest, LatestBarResult } from './market-data.types';

@Injectable()
export class LatestBarService {
  constructor(
    private readonly client: MarketDataClientService,
    private readonly futureBars: MarketDataFutureBarsService,
  ) {}

  async getLatestBar(request: LatestBarRequest): Promise<LatestBarResult> {
    const symbol = this.normalizeSymbol(request.symbol);

    const response = await this.client.request<LatestBarApiResponse>({
      cacheTtlMs: MARKET_DATA_CACHE_TTL_MS.LATEST,
      path: `/v2/stocks/${encodeURIComponent(symbol)}/bars/latest`,
      query: {
        feed: request.feed,
        currency: request.currency,
      },
    });

    const result = normalizeLatestBar(response.data, symbol);

    const futureBars = this.futureBars.detect([result.bar]);

    return {
      ...result,
      futureBars,
    };
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized || normalized.length > 32) {
      throw new Error('Invalid latest bar symbol');
    }

    return normalized;
  }
}
