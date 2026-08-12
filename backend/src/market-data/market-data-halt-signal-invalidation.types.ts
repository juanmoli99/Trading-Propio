import type { MarketDataHaltReason } from './market-data-halt-detection.types';

export interface HaltSensitiveSignal {
  readonly symbol: string;
  readonly timestamp: Date;
}

export interface MarketDataHaltSignalInvalidationResult {
  readonly symbol: string;
  readonly invalidated: boolean;
  readonly signalTimestamp: Date;
  readonly haltedAt: Date | null;
  readonly haltReason: MarketDataHaltReason | null;
}