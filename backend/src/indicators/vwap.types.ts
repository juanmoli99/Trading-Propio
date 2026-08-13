import type { MarketDataBar } from '../market-data/market-data.types';

export interface VwapInput {
  readonly bars: readonly MarketDataBar[];
}

export interface VwapResult {
  readonly value: number;
  readonly cumulativeVolume: number;
  readonly cumulativePriceVolume: number;
}
