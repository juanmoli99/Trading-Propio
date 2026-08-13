import type { CorporateActionType } from './corporate-actions.types';

export interface CorporateActionMarketDataCacheInvalidationQuery {
  readonly symbols?: readonly string[];
  readonly asOf?: Date;
  readonly start?: string;
}

export interface CorporateActionMarketDataCacheInvalidationItem {
  readonly corporateActionId: string;
  readonly corporateActionType: CorporateActionType;
  readonly processDate: Date;
  readonly affectedSymbols: readonly string[];
  readonly invalidatedEntryCount: number;
}

export interface CorporateActionMarketDataCacheInvalidationResult {
  readonly asOf: Date;
  readonly items: readonly CorporateActionMarketDataCacheInvalidationItem[];
  readonly affectedSymbolCount: number;
  readonly invalidatedEntryCount: number;
}
