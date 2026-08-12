import type { MarketDataTradingStatus } from './market-data-trading-status.types';

export const MARKET_DATA_HALT_STATES = [
  'HALTED',
  'NOT_HALTED',
  'UNKNOWN',
] as const;

export type MarketDataHaltState =
  (typeof MARKET_DATA_HALT_STATES)[number];

export interface MarketDataHaltReason {
  readonly code: string;
  readonly message: string;
}

export interface MarketDataHaltDetectionResult {
  readonly symbol: string;
  readonly state: MarketDataHaltState;
  readonly halted: boolean;
  readonly haltedAt: Date | null;
  readonly haltReason: MarketDataHaltReason | null;
  readonly status: MarketDataTradingStatus | null;
}

export interface MarketDataResumeDetectionResult {
  readonly symbol: string;
  readonly resumed: boolean;
  readonly previousState: MarketDataHaltState;
  readonly currentState: MarketDataHaltState;
  readonly previousStatus: MarketDataTradingStatus | null;
  readonly currentStatus: MarketDataTradingStatus | null;
}