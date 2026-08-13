export const SYMBOL_SUSPENSION_FILTER_STATUSES = [
  'ALLOWED',
  'SUSPENDED',
  'INACTIVE',
  'UNKNOWN_ASSET_STATUS',
  'SYMBOL_NOT_FOUND',
] as const;

export type SymbolSuspensionFilterStatus =
  (typeof SYMBOL_SUSPENSION_FILTER_STATUSES)[number];

export interface SymbolSuspensionFilterResult {
  readonly symbol: string;
  readonly alpacaStatus: string | null;
  readonly allowed: boolean;
  readonly status: SymbolSuspensionFilterStatus;
  readonly reason: string;
}
