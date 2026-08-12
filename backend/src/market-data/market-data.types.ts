import type { MarketDataAdjustment } from './market-data-adjustment';
import type { MarketDataPaginatedResult } from './market-data-pagination.types';
import type { MarketDataTimeframe } from './market-data-timeframe';

export type MarketDataFeed = 'iex' | 'sip';

export type MarketDataSort = 'asc' | 'desc';

export interface MarketDataRequestOptions {
  readonly feed?: MarketDataFeed;
  readonly currency?: string;
}

export interface MarketDataHistoricalRequestOptions extends MarketDataRequestOptions {
  readonly start?: string;
  readonly end?: string;
  readonly limit?: number;
  readonly pageToken?: string;
  readonly adjustment?: MarketDataAdjustment;
}

export interface MarketDataHttpRequest {
  readonly path: string;
  readonly query?: Readonly<
    Record<string, string | number | boolean | undefined>
  >;
  readonly cacheTtlMs?: number;
}

export interface MarketDataHttpResponse<T> {
  readonly status: number;
  readonly data: T;
  readonly headers: Readonly<Record<string, string>>;
}

export interface MarketDataBar {
  readonly timestamp: Date;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly tradeCount: number;
  readonly vwap: number;
}

export interface MarketDataMissingBarGap {
  readonly previousTimestamp: Date;
  readonly nextTimestamp: Date;
  readonly missingCount: number;
  readonly expectedIntervalMs: number;
}

export interface MarketDataFutureBar {
  readonly timestamp: Date;
  readonly referenceTimestamp: Date;
  readonly futureByMs: number;
}

export interface HistoricalBarsResult {
  readonly symbol: string;
  readonly bars: MarketDataBar[];
  readonly nextPageToken: string | null;
  readonly missingBarGaps: MarketDataMissingBarGap[];
  readonly futureBars: MarketDataFutureBar[];
}

export interface HistoricalBarsPaginatedResult extends MarketDataPaginatedResult<MarketDataBar> {
  readonly missingBarGaps: MarketDataMissingBarGap[];
  readonly futureBars: MarketDataFutureBar[];
}

export interface HistoricalBarsRequest extends MarketDataHistoricalRequestOptions {
  readonly symbol: string;
  readonly timeframe: MarketDataTimeframe;
  readonly sort?: MarketDataSort;
}

export interface LatestBarRequest extends MarketDataRequestOptions {
  readonly symbol: string;
}

export interface LatestBarResult {
  readonly symbol: string;
  readonly bar: MarketDataBar;
  readonly futureBars: MarketDataFutureBar[];
}

export interface MarketDataQuote {
  readonly timestamp: Date;
  readonly askExchange: string;
  readonly askPrice: number;
  readonly askSize: number;
  readonly bidExchange: string;
  readonly bidPrice: number;
  readonly bidSize: number;
  readonly conditions: string[];
  readonly tape: string;
}

export interface HistoricalQuotesRequest extends MarketDataHistoricalRequestOptions {
  readonly symbol: string;
}

export interface HistoricalQuotesResult {
  readonly symbol: string;
  readonly quotes: MarketDataQuote[];
  readonly nextPageToken: string | null;
}

export interface LatestQuoteRequest extends MarketDataRequestOptions {
  readonly symbol: string;
}

export interface LatestQuoteResult {
  readonly symbol: string;
  readonly quote: MarketDataQuote;
}

export interface MarketDataTrade {
  readonly timestamp: Date;
  readonly exchange: string;
  readonly price: number;
  readonly size: number;
  readonly conditions: string[];
  readonly id: number;
  readonly tape: string;
}

export interface HistoricalTradesRequest extends MarketDataHistoricalRequestOptions {
  readonly symbol: string;
  readonly asOf?: string;
  readonly sort?: MarketDataSort;
}

export interface HistoricalTradesResult {
  readonly symbol: string;
  readonly trades: MarketDataTrade[];
  readonly nextPageToken: string | null;
}

export interface LatestTradeRequest extends MarketDataRequestOptions {
  readonly symbol: string;
}

export interface LatestTradeResult {
  readonly symbol: string;
  readonly trade: MarketDataTrade;
}
