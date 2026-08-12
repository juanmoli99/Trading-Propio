import type { MarketDataFeed } from './market-data.types';

export interface MarketDataTradingStatus {
  readonly symbol: string;
  readonly statusCode: string;
  readonly statusMessage: string;
  readonly reasonCode: string;
  readonly reasonMessage: string;
  readonly timestamp: Date;
  readonly tape: string;
  readonly feed: MarketDataFeed;
  readonly receivedAt: Date;
}

export interface MarketDataTradingStatusSnapshot {
  readonly symbol: string;
  readonly status: MarketDataTradingStatus | null;
  readonly previousStatus: MarketDataTradingStatus | null;
}