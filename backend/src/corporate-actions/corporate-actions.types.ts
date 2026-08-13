export const CORPORATE_ACTION_TYPES = [
  'reverse_split',
  'forward_split',
  'unit_split',
  'cash_dividend',
  'stock_dividend',
  'spin_off',
  'cash_merger',
  'stock_merger',
  'stock_and_cash_merger',
  'redemption',
  'name_change',
  'worthless_removal',
  'rights_distribution',
  'reorganization',
  'partial_call',
] as const;

export type CorporateActionType =
  (typeof CORPORATE_ACTION_TYPES)[number];

export type CorporateActionSort = 'asc' | 'desc';

export interface CorporateActionQuery {
  readonly symbols?: readonly string[];
  readonly types?: readonly CorporateActionType[];
  readonly start?: string;
  readonly end?: string;
  readonly ids?: readonly string[];
  readonly limit?: number;
  readonly pageToken?: string;
  readonly sort?: CorporateActionSort;
}

export interface CorporateActionRecord {
  readonly id: string;
  readonly type: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date | null;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface CorporateActionPage {
  readonly actions: readonly CorporateActionRecord[];
  readonly nextPageToken: string | null;
}

export interface CorporateActionPaginatedResult {
  readonly items: CorporateActionRecord[];
  readonly pagesFetched: number;
  readonly complete: boolean;
  readonly nextPageToken: string | null;
}