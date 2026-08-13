import type { CorporateActionType } from './corporate-actions.types';

export const CORPORATE_ACTION_COST_BASIS_RECONCILIATION_STATUSES = [
  'MATCHED',
  'MISMATCH',
  'NOT_APPLICABLE',
] as const;

export type CorporateActionCostBasisReconciliationStatus =
  (typeof CORPORATE_ACTION_COST_BASIS_RECONCILIATION_STATUSES)[number];

export interface CorporateActionCostBasisReconciliationQuery {
  readonly symbols?: readonly string[];
  readonly asOf?: Date;
  readonly start?: string;
}

export interface CorporateActionCostBasisReconciliationItem {
  readonly corporateActionId: string;
  readonly corporateActionType: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date;
  readonly currentCostBasis: string | null;
  readonly expectedCostBasis: string | null;
  readonly status: CorporateActionCostBasisReconciliationStatus;
  readonly reason: string;
}

export interface CorporateActionCostBasisReconciliationResult {
  readonly asOf: Date;
  readonly items: readonly CorporateActionCostBasisReconciliationItem[];
  readonly matchedCount: number;
  readonly mismatchCount: number;
  readonly notApplicableCount: number;
}