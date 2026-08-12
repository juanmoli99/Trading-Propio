import { Injectable } from '@nestjs/common';
import { normalizeMarketDataAdjustment } from './market-data-adjustment';
import { MARKET_DATA_CACHE_TTL_MS } from './market-data-cache.constants';
import { validateMarketDataChronologicalOrder } from './market-data-chronology';
import { MarketDataClientService } from './market-data-client.service';
import { validateNoDuplicateBars } from './market-data-duplicates';
import { MarketDataFutureBarsService } from './market-data-future-bars.service';
import {
  normalizeHistoricalBars,
  type HistoricalBarsApiResponse,
} from './market-data.mapper';
import { MarketDataMissingBarsService } from './market-data-missing-bars.service';
import { validateMarketDataHistoricalTimestamp } from './market-data-normalization';
import { MarketDataPaginationService } from './market-data-pagination.service';
import type { MarketDataPaginationOptions } from './market-data-pagination.types';
import {
  formatMarketDataTimeframe,
  validateMarketDataTimeframe,
} from './market-data-timeframe';
import type {
  HistoricalBarsPaginatedResult,
  HistoricalBarsRequest,
  HistoricalBarsResult,
} from './market-data.types';

@Injectable()
export class HistoricalBarsService {
  constructor(
    private readonly client: MarketDataClientService,
    private readonly pagination: MarketDataPaginationService,
    private readonly missingBars: MarketDataMissingBarsService,
    private readonly futureBars: MarketDataFutureBarsService,
  ) {}

  async getBars(request: HistoricalBarsRequest): Promise<HistoricalBarsResult> {
    const result = await this.fetchPage(request);

    const missingBarGaps = await this.missingBars.detect(
      result.bars,
      request.timeframe,
    );

    const futureBars = this.futureBars.detect(result.bars);

    return {
      ...result,
      missingBarGaps,
      futureBars,
    };
  }

  async getAllBars(
    request: HistoricalBarsRequest,
    paginationOptions?: MarketDataPaginationOptions,
  ): Promise<HistoricalBarsPaginatedResult> {
    const result = await this.pagination.collect(async (pageToken) => {
      const page = await this.fetchPage({
        ...request,
        pageToken,
      });

      return {
        items: page.bars,
        nextPageToken: page.nextPageToken,
      };
    }, paginationOptions);

    validateNoDuplicateBars(result.items);

    validateMarketDataChronologicalOrder(result.items, request.sort ?? 'asc');

    const missingBarGaps = await this.missingBars.detect(
      result.items,
      request.timeframe,
    );

    const futureBars = this.futureBars.detect(result.items);

    return {
      ...result,
      missingBarGaps,
      futureBars,
    };
  }

  private async fetchPage(
    request: HistoricalBarsRequest,
  ): Promise<HistoricalBarsResult> {
    const symbol = this.normalizeSymbol(request.symbol);

    this.validateOptions(request);

    const timeframe = formatMarketDataTimeframe(request.timeframe);

    const adjustment = normalizeMarketDataAdjustment(request.adjustment);

    const response = await this.client.request<HistoricalBarsApiResponse>({
      cacheTtlMs: MARKET_DATA_CACHE_TTL_MS.HISTORICAL,
      path: `/v2/stocks/${encodeURIComponent(symbol)}/bars`,
      query: {
        timeframe,
        start: request.start,
        end: request.end,
        limit: request.limit,
        page_token: request.pageToken,
        adjustment,
        feed: request.feed,
        currency: request.currency,
        sort: request.sort,
      },
    });

    const result = normalizeHistoricalBars(response.data, symbol);

    validateNoDuplicateBars(result.bars);

    validateMarketDataChronologicalOrder(result.bars, request.sort ?? 'asc');

    return result;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized || normalized.length > 32) {
      throw new Error('Invalid market data symbol');
    }

    return normalized;
  }

  private validateOptions(request: HistoricalBarsRequest): void {
    validateMarketDataTimeframe(request.timeframe);

    if (
      request.limit !== undefined &&
      (!Number.isInteger(request.limit) ||
        request.limit < 1 ||
        request.limit > 10000)
    ) {
      throw new Error('Historical bars limit must be between 1 and 10000');
    }

    const start = this.parseOptionalDate(request.start, 'start');

    const end = this.parseOptionalDate(request.end, 'end');

    if (start !== null && end !== null && start.getTime() > end.getTime()) {
      throw new Error('Historical bars start must not be after end');
    }

    if (request.pageToken !== undefined && !request.pageToken.trim()) {
      throw new Error('Historical bars page token cannot be empty');
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
      throw new Error(`Historical bars ${field} cannot be empty`);
    }

    validateMarketDataHistoricalTimestamp(trimmed, field);

    return new Date(trimmed);
  }
}
