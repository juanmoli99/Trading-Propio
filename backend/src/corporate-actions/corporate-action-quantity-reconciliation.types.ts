import type { CorporateActionType } from './corporate-actions.types';

export const CORPORATE_ACTION_QUANTITY_RECONCILIATION_STATUSES = [
  'MATCHED',
  'MISMATCH',
  'NOT_APPLICABLE',
] as const;

export type CorporateActionQuantityReconciliationStatus =
  (typeof CORPORATE_ACTION_QUANTITY_RECONCILIATION_STATUSES)[number];

export interface CorporateActionQuantityReconciliationQuery {
  readonly symbols?: readonly string[];
  readonly asOf?: Date;
  readonly start?: string;
}

export interface CorporateActionQuantityReconciliationItem {
  readonly corporateActionId: string;
  readonly corporateActionType: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date;
  readonly currentQuantity: string | null;
  readonly expectedQuantity: string | null;
  readonly quantityFactor: number | null;
  readonly status: CorporateActionQuantityReconciliationStatus;
  readonly reason: string;
}

export interface CorporateActionQuantityReconciliationResult {
  readonly asOf: Date;
  readonly items: readonly CorporateActionQuantityReconciliationItem[];
  readonly matchedCount: number;
  readonly mismatchCount: number;
  readonly notApplicableCount: number;
}