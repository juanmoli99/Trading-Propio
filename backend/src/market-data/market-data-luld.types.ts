import type { MarketDataFeed } from './market-data.types';

export interface MarketDataLuldStatus {
  readonly symbol: string;
  readonly limitUp: number;
  readonly limitDown: number;
  readonly indicator: string;
  readonly timestamp: Date;
  readonly tape: string;
  readonly feed: MarketDataFeed;
  readonly receivedAt: Date;
}

export interface MarketDataLuldStatusSnapshot {
  readonly symbol: string;
  readonly luld: MarketDataLuldStatus | null;
}