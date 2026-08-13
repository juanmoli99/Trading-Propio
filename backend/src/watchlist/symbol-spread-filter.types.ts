export const SYMBOL_SPREAD_FILTER_STATUSES = [
  'ALLOWED',
  'SPREAD_ABOVE_MAXIMUM',
  'INVALID_BID',
  'INVALID_ASK',
  'INVALID_MARKET',
  'INVALID_SPREAD',
] as const;

export type SymbolSpreadFilterStatus =
  (typeof SYMBOL_SPREAD_FILTER_STATUSES)[number];

export interface SymbolSpreadFilterQuery {
  readonly symbol: string;
  readonly bidPrice: number;
  readonly askPrice: number;
  readonly maximumSpreadPercent: number;
}

export interface SymbolSpreadFilterResult {
  readonly symbol: string;
  readonly bidPrice: number;
  readonly askPrice: number;
  readonly midpoint: number | null;
  readonly spread: number | null;
  readonly spreadPercent: number | null;
  readonly maximumSpreadPercent: number;
  readonly allowed: boolean;
  readonly status: SymbolSpreadFilterStatus;
  readonly reason: string;
}
