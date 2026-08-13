import type { MarketDataBar } from '../market-data/market-data.types';

export interface AtrInput {
  readonly bars: readonly MarketDataBar[];
  readonly period: number;
}

export interface AtrResult {
  readonly value: number;
  readonly period: number;
  readonly trueRange: number;
}
