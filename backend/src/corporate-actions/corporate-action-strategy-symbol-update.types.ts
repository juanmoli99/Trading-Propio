export const CORPORATE_ACTION_STRATEGY_SYMBOL_UPDATE_STATUSES = [
  'UPDATED',
  'REMOVED_OBSOLETE_DUPLICATE',
  'NOT_ASSOCIATED',
  'NAME_ONLY',
] as const;

export type CorporateActionStrategySymbolUpdateStatus =
  (typeof CORPORATE_ACTION_STRATEGY_SYMBOL_UPDATE_STATUSES)[number];

export interface CorporateActionStrategySymbolUpdateQuery {
  readonly symbols?: readonly string[];
  readonly asOf?: Date;
  readonly start?: string;
}

export interface CorporateActionStrategySymbolUpdateItem {
  readonly corporateActionId: string;
  readonly processDate: Date;
  readonly oldSymbol: string;
  readonly newSymbol: string;
  readonly status: CorporateActionStrategySymbolUpdateStatus;
  readonly updatedAssociationCount: number;
  readonly removedDuplicateCount: number;
}

export interface CorporateActionStrategySymbolUpdateResult {
  readonly asOf: Date;
  readonly items: readonly CorporateActionStrategySymbolUpdateItem[];
  readonly updatedEventCount: number;
  readonly removedObsoleteDuplicateEventCount: number;
  readonly notAssociatedCount: number;
  readonly nameOnlyCount: number;
  readonly updatedAssociationCount: number;
  readonly removedDuplicateCount: number;
}