import type { MarketDataBar } from '../market-data/market-data.types';

export interface AdxInput {
  readonly bars: readonly MarketDataBar[];
  readonly period: number;
}

export interface AdxResult {
  readonly adx: number;
  readonly plusDi: number;
  readonly minusDi: number;
  readonly dx: number;
  readonly period: number;
}
