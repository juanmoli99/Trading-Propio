export const SYMBOL_TRADABLE_FILTER_STATUSES = [
  'ALLOWED',
  'NOT_TRADABLE',
  'UNKNOWN_TRADABLE_STATE',
  'SYMBOL_NOT_FOUND',
] as const;

export type SymbolTradableFilterStatus =
  (typeof SYMBOL_TRADABLE_FILTER_STATUSES)[number];

export interface SymbolTradableFilterResult {
  readonly symbol: string;
  readonly allowed: boolean;
  readonly status: SymbolTradableFilterStatus;
  readonly tradable: boolean | null;
  readonly reason: string;
}
