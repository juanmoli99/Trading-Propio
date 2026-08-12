import { Injectable } from '@nestjs/common';
import { MARKET_DATA_CACHE_TTL_MS } from './market-data-cache.constants';
import { validateMarketDataChronologicalOrder } from './market-data-chronology';
import { validateNoDuplicateQuotes } from './market-data-duplicates';
import { validateMarketDataHistoricalTimestamp } from './market-data-normalization';
import { MarketDataClientService } from './market-data-client.service';
import {
  normalizeHistoricalQuotes,
  type HistoricalQuotesApiResponse,
} from './market-data.mapper';
import { MarketDataPaginationService } from './market-data-pagination.service';
import type {
  MarketDataPaginatedResult,
  MarketDataPaginationOptions,
} from './market-data-pagination.types';
import type {
  HistoricalQuotesRequest,
  HistoricalQuotesResult,
  MarketDataQuote,
} from './market-data.types';

@Injectable()
export class HistoricalQuotesService {
  constructor(
    private readonly client: MarketDataClientService,
    private readonly pagination: MarketDataPaginationService,
  ) {}

  async getQuotes(
    request: HistoricalQuotesRequest,
  ): Promise<HistoricalQuotesResult> {
    const symbol = this.normalizeSymbol(request.symbol);

    this.validateOptions(request);

    const response = await this.client.request<HistoricalQuotesApiResponse>({
      cacheTtlMs: MARKET_DATA_CACHE_TTL_MS.HISTORICAL,
      path: `/v2/stocks/${encodeURIComponent(symbol)}/quotes`,
      query: {
        start: request.start,
        end: request.end,
        limit: request.limit,
        page_token: request.pageToken,
        feed: request.feed,
        currency: request.currency,
      },
    });

    const result = normalizeHistoricalQuotes(response.data, symbol);

    validateNoDuplicateQuotes(result.quotes);

    validateMarketDataChronologicalOrder(result.quotes, 'asc');

    return result;
  }

  async getAllQuotes(
    request: HistoricalQuotesRequest,
    paginationOptions?: MarketDataPaginationOptions,
  ): Promise<MarketDataPaginatedResult<MarketDataQuote>> {
    const result = await this.pagination.collect(async (pageToken) => {
      const page = await this.getQuotes({
        ...request,
        pageToken,
      });

      return {
        items: page.quotes,
        nextPageToken: page.nextPageToken,
      };
    }, paginationOptions);

    validateNoDuplicateQuotes(result.items);

    validateMarketDataChronologicalOrder(result.items, 'asc');

    return result;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized || normalized.length > 32) {
      throw new Error('Invalid historical quotes symbol');
    }

    return normalized;
  }

  private validateOptions(request: HistoricalQuotesRequest): void {
    if (
      request.limit !== undefined &&
      (!Number.isInteger(request.limit) ||
        request.limit < 1 ||
        request.limit > 10000)
    ) {
      throw new Error('Historical quotes limit must be between 1 and 10000');
    }

    const start = this.parseOptionalDate(request.start, 'start');

    const end = this.parseOptionalDate(request.end, 'end');

    if (start !== null && end !== null && start.getTime() > end.getTime()) {
      throw new Error('Historical quotes start must not be after end');
    }

    if (request.pageToken !== undefined && !request.pageToken.trim()) {
      throw new Error('Historical quotes page token cannot be empty');
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
      throw new Error(`Historical quotes ${field} cannot be empty`);
    }

    validateMarketDataHistoricalTimestamp(trimmed, field);

    return new Date(trimmed);
  }
}
