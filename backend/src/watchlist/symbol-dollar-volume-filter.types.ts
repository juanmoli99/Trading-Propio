export const SYMBOL_DOLLAR_VOLUME_FILTER_STATUSES = [
  'ALLOWED',
  'DOLLAR_VOLUME_BELOW_MINIMUM',
  'INVALID_PRICE',
  'INVALID_VOLUME',
  'INVALID_DOLLAR_VOLUME',
] as const;

export type SymbolDollarVolumeFilterStatus =
  (typeof SYMBOL_DOLLAR_VOLUME_FILTER_STATUSES)[number];

export interface SymbolDollarVolumeFilterQuery {
  readonly symbol: string;
  readonly price: number;
  readonly volume: number | null;
  readonly minimumDollarVolume: number;
}

export interface SymbolDollarVolumeFilterResult {
  readonly symbol: string;
  readonly price: number;
  readonly volume: number | null;
  readonly dollarVolume: number | null;
  readonly minimumDollarVolume: number;
  readonly allowed: boolean;
  readonly status: SymbolDollarVolumeFilterStatus;
  readonly reason: string;
}
