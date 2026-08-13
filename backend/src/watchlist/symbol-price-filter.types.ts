export const SYMBOL_PRICE_FILTER_STATUSES = [
  'ALLOWED',
  'PRICE_BELOW_MINIMUM',
  'PRICE_ABOVE_MAXIMUM',
  'INVALID_PRICE',
] as const;

export type SymbolPriceFilterStatus =
  (typeof SYMBOL_PRICE_FILTER_STATUSES)[number];

export interface SymbolPriceFilterQuery {
  readonly symbol: string;
  readonly price: number;
  readonly minimumPrice: number;
  readonly maximumPrice: number;
}

export interface SymbolPriceFilterResult {
  readonly symbol: string;
  readonly price: number;
  readonly minimumPrice: number;
  readonly maximumPrice: number;
  readonly allowed: boolean;
  readonly status: SymbolPriceFilterStatus;
  readonly reason: string;
}
