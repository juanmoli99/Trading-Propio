export interface CorporateActionCashDividend {
  readonly id: string;
  readonly symbol: string;
  readonly processDate: Date;
  readonly rate: number;
  readonly currency: string | null;
  readonly exDate: Date | null;
  readonly recordDate: Date | null;
  readonly payableDate: Date | null;
}

export interface CorporateActionCashDividendQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface CorporateActionCashDividendResult {
  readonly symbol: string;
  readonly dividends: readonly CorporateActionCashDividend[];
}