export const CORPORATE_ACTION_WATCHLIST_UPDATE_STATUSES = [
  'UPDATED',
  'REMOVED_OBSOLETE_DUPLICATE',
  'NOT_IN_WATCHLIST',
  'NAME_ONLY',
] as const;

export type CorporateActionWatchlistUpdateStatus =
  (typeof CORPORATE_ACTION_WATCHLIST_UPDATE_STATUSES)[number];

export interface CorporateActionWatchlistUpdateQuery {
  readonly symbols?: readonly string[];
  readonly asOf?: Date;
  readonly start?: string;
}

export interface CorporateActionWatchlistUpdateItem {
  readonly corporateActionId: string;
  readonly processDate: Date;
  readonly oldSymbol: string;
  readonly newSymbol: string;
  readonly status: CorporateActionWatchlistUpdateStatus;
}

export interface CorporateActionWatchlistUpdateResult {
  readonly asOf: Date;
  readonly items: readonly CorporateActionWatchlistUpdateItem[];
  readonly updatedCount: number;
  readonly removedObsoleteDuplicateCount: number;
  readonly notInWatchlistCount: number;
  readonly nameOnlyCount: number;
}