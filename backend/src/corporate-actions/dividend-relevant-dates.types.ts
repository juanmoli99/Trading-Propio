import type { CorporateActionCashDividend } from './corporate-action-cash-dividend.types';

export const DIVIDEND_RELEVANT_DATE_TYPES = [
  'EX_DATE',
  'RECORD_DATE',
  'PAYABLE_DATE',
] as const;

export type DividendRelevantDateType =
  (typeof DIVIDEND_RELEVANT_DATE_TYPES)[number];

export interface DividendRelevantDate {
  readonly corporateActionId: string;
  readonly symbol: string;
  readonly type: DividendRelevantDateType;
  readonly date: Date;
  readonly rate: number;
  readonly currency: string | null;
}

export interface DividendRelevantDatesQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface DividendRelevantDatesResult {
  readonly symbol: string;
  readonly dates: readonly DividendRelevantDate[];
}

export type DividendRelevantDateSource = CorporateActionCashDividend;
