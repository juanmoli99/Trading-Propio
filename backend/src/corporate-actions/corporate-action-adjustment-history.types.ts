import type { CorporateActionType } from './corporate-actions.types';

export const CORPORATE_ACTION_ADJUSTMENT_TYPES = [
  'SYMBOL_UPDATE',
  'WATCHLIST_UPDATE',
  'STRATEGY_SYMBOL_UPDATE',
  'MARKET_DATA_CACHE_INVALIDATION',
  'POST_EVENT_RECONCILIATION',
] as const;

export type CorporateActionAdjustmentType =
  (typeof CORPORATE_ACTION_ADJUSTMENT_TYPES)[number];

export interface RecordCorporateActionAdjustmentInput {
  readonly corporateActionId: string;
  readonly corporateActionType: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date;
  readonly adjustmentType: CorporateActionAdjustmentType;
  readonly status: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface CorporateActionAdjustmentHistoryRecord {
  readonly id: string;
  readonly corporateActionId: string;
  readonly corporateActionType: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date;
  readonly adjustmentType: CorporateActionAdjustmentType;
  readonly status: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly recordedAt: Date;
}
