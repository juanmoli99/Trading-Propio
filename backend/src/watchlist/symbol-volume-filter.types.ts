export const SYMBOL_VOLUME_FILTER_STATUSES = [
  'ALLOWED',
  'VOLUME_BELOW_MINIMUM',
  'INVALID_VOLUME',
] as const;

export type SymbolVolumeFilterStatus =
  (typeof SYMBOL_VOLUME_FILTER_STATUSES)[number];

export interface SymbolVolumeFilterQuery {
  readonly symbol: string;
  readonly volume: number | null;
  readonly minimumVolume: number;
}

export interface SymbolVolumeFilterResult {
  readonly symbol: string;
  readonly volume: number | null;
  readonly minimumVolume: number;
  readonly allowed: boolean;
  readonly status: SymbolVolumeFilterStatus;
  readonly reason: string;
}
