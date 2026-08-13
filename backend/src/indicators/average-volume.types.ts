import type { MarketDataBar } from '../market-data/market-data.types';

export interface AverageVolumeInput {
  readonly bars: readonly MarketDataBar[];
  readonly period: number;
}

export interface AverageVolumeResult {
  readonly value: number;
  readonly period: number;
  readonly totalVolume: number;
}
