import type { MarketDataHaltReason } from './market-data-halt-detection.types';

export interface HaltSensitivePrice {
  readonly symbol: string;
  readonly timestamp: Date;
}

export interface MarketDataHaltPriceInvalidationResult {
  readonly symbol: string;
  readonly invalidated: boolean;
  readonly priceTimestamp: Date;
  readonly haltedAt: Date | null;
  readonly haltReason: MarketDataHaltReason | null;
}