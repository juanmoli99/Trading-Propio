import type { SymbolDollarVolumeFilterStatus } from './symbol-dollar-volume-filter.types';
import type { SymbolVolumeFilterStatus } from './symbol-volume-filter.types';

export const SYMBOL_LIQUIDITY_FILTER_STATUSES = [
  'ALLOWED',
  'VOLUME_FILTER_FAILED',
  'DOLLAR_VOLUME_FILTER_FAILED',
] as const;

export type SymbolLiquidityFilterStatus =
  (typeof SYMBOL_LIQUIDITY_FILTER_STATUSES)[number];

export interface SymbolLiquidityFilterQuery {
  readonly symbol: string;
  readonly price: number;
  readonly volume: number | null;
  readonly minimumVolume: number;
  readonly minimumDollarVolume: number;
}

export interface SymbolLiquidityFilterResult {
  readonly symbol: string;
  readonly price: number;
  readonly volume: number | null;
  readonly dollarVolume: number | null;
  readonly minimumVolume: number;
  readonly minimumDollarVolume: number;
  readonly allowed: boolean;
  readonly status: SymbolLiquidityFilterStatus;
  readonly volumeStatus: SymbolVolumeFilterStatus;
  readonly dollarVolumeStatus: SymbolDollarVolumeFilterStatus;
  readonly reason: string;
}
