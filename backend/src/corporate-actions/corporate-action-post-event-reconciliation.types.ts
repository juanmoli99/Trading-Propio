import type { CorporateActionType } from './corporate-actions.types';

export const CORPORATE_ACTION_POST_EVENT_RECONCILIATION_STATUSES = [
  'MATCHED',
  'MISMATCH',
  'NOT_APPLICABLE',
] as const;

export type CorporateActionPostEventReconciliationStatus =
  (typeof CORPORATE_ACTION_POST_EVENT_RECONCILIATION_STATUSES)[number];

export interface CorporateActionPostEventReconciliationQuery {
  readonly symbols?: readonly string[];
  readonly asOf?: Date;
  readonly start?: string;
}

export interface CorporateActionPostEventReconciliationItem {
  readonly corporateActionId: string;
  readonly corporateActionType: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date;

  readonly quantityStatus: 'MATCHED' | 'MISMATCH' | 'NOT_APPLICABLE';

  readonly costBasisStatus: 'MATCHED' | 'MISMATCH' | 'NOT_APPLICABLE';

  readonly status: CorporateActionPostEventReconciliationStatus;

  readonly quantityReason: string;
  readonly costBasisReason: string;
}

export interface CorporateActionPostEventReconciliationResult {
  readonly asOf: Date;
  readonly items: readonly CorporateActionPostEventReconciliationItem[];

  readonly matchedCount: number;
  readonly mismatchCount: number;
  readonly notApplicableCount: number;

  readonly reconciliationSuccessful: boolean;
}
