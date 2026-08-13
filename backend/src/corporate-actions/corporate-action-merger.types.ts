export const CORPORATE_ACTION_MERGER_TYPES = [
  'cash_merger',
  'stock_merger',
  'stock_and_cash_merger',
] as const;

export type CorporateActionMergerType =
  (typeof CORPORATE_ACTION_MERGER_TYPES)[number];

export interface CorporateActionMerger {
  readonly id: string;
  readonly type: CorporateActionMergerType;
  readonly symbol: string;
  readonly processDate: Date;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface CorporateActionMergerQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface CorporateActionMergerResult {
  readonly symbol: string;
  readonly mergers: readonly CorporateActionMerger[];
}