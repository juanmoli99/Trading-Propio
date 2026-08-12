import { Injectable } from '@nestjs/common';
import { MARKET_DATA_CACHE_TTL_MS } from './market-data-cache.constants';
import { validateMarketDataChronologicalOrder } from './market-data-chronology';
import { validateNoDuplicateTrades } from './market-data-duplicates';
import { validateMarketDataHistoricalTimestamp } from './market-data-normalization';
import { MarketDataClientService } from './market-data-client.service';
import {
  normalizeHistoricalTrades,
  type HistoricalTradesApiResponse,
} from './market-data.mapper';
import { MarketDataPaginationService } from './market-data-pagination.service';
import type {
  MarketDataPaginatedResult,
  MarketDataPaginationOptions,
} from './market-data-pagination.types';
import type {
  HistoricalTradesRequest,
  HistoricalTradesResult,
  MarketDataTrade,
} from './market-data.types';

@Injectable()
export class HistoricalTradesService {
  constructor(
    private readonly client: MarketDataClientService,
    private readonly pagination: MarketDataPaginationService,
  ) {}

  async getTrades(
    request: HistoricalTradesRequest,
  ): Promise<HistoricalTradesResult> {
    const symbol = this.normalizeSymbol(request.symbol);

    this.validateOptions(request);

    const response = await this.client.request<HistoricalTradesApiResponse>({
      cacheTtlMs: MARKET_DATA_CACHE_TTL_MS.HISTORICAL,
      path: `/v2/stocks/${encodeURIComponent(symbol)}/trades`,
      query: {
        start: request.start,
        end: request.end,
        limit: request.limit,
        page_token: request.pageToken,
        feed: request.feed,
        currency: request.currency,
        asof: request.asOf,
        sort: request.sort,
      },
    });

    const result = normalizeHistoricalTrades(response.data, symbol);

    validateNoDuplicateTrades(result.trades);

    validateMarketDataChronologicalOrder(result.trades, request.sort ?? 'asc');

    return result;
  }

  async getAllTrades(
    request: HistoricalTradesRequest,
    paginationOptions?: MarketDataPaginationOptions,
  ): Promise<MarketDataPaginatedResult<MarketDataTrade>> {
    const result = await this.pagination.collect(async (pageToken) => {
      const page = await this.getTrades({
        ...request,
        pageToken,
      });

      return {
        items: page.trades,
        nextPageToken: page.nextPageToken,
      };
    }, paginationOptions);

    validateNoDuplicateTrades(result.items);

    validateMarketDataChronologicalOrder(result.items, request.sort ?? 'asc');

    return result;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized || normalized.length > 32) {
      throw new Error('Invalid historical trades symbol');
    }

    return normalized;
  }

  private validateOptions(request: HistoricalTradesRequest): void {
    if (
      request.limit !== undefined &&
      (!Number.isInteger(request.limit) ||
        request.limit < 1 ||
        request.limit > 10000)
    ) {
      throw new Error('Historical trades limit must be between 1 and 10000');
    }

    const start = this.parseOptionalDate(request.start, 'start');

    const end = this.parseOptionalDate(request.end, 'end');

    if (start !== null && end !== null && start.getTime() > end.getTime()) {
      throw new Error('Historical trades start must not be after end');
    }

    if (request.pageToken !== undefined && !request.pageToken.trim()) {
      throw new Error('Historical trades page token cannot be empty');
    }

    if (request.asOf !== undefined && !this.isValidAsOf(request.asOf)) {
      throw new Error('Invalid historical trades asOf');
    }
  }

  private parseOptionalDate(
    value: string | undefined,
    field: string,
  ): Date | null {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      throw new Error(`Historical trades ${field} cannot be empty`);
    }

    validateMarketDataHistoricalTimestamp(trimmed, field);

    return new Date(trimmed);
  }

  private isValidAsOf(value: string): boolean {
    if (value === '-') {
      return true;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(parsed.getTime());
  }
}
