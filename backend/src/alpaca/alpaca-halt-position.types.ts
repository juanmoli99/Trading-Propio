import type { MarketDataHaltReason } from '../market-data/market-data-halt-detection.types';
import type { AlpacaPosition } from './alpaca-position.types';

export interface AlpacaHaltPositionResult {
  readonly symbol: string;
  readonly position: AlpacaPosition;
  readonly affectedByHalt: boolean;
  readonly haltedAt: Date | null;
  readonly haltReason: MarketDataHaltReason | null;
}