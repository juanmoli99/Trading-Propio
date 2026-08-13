export interface CorporateActionStockDividend {
  readonly id: string;
  readonly symbol: string;
  readonly processDate: Date;
  readonly rate: number;
  readonly exDate: Date | null;
  readonly recordDate: Date | null;
  readonly payableDate: Date | null;
}

export interface CorporateActionStockDividendQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface CorporateActionStockDividendResult {
  readonly symbol: string;
  readonly dividends: readonly CorporateActionStockDividend[];
}