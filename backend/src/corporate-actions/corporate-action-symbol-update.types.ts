export const CORPORATE_ACTION_SYMBOL_UPDATE_STATUSES = [
  'UPDATED',
  'NO_LOCAL_REFERENCES',
  'NAME_ONLY',
] as const;

export type CorporateActionSymbolUpdateStatus =
  (typeof CORPORATE_ACTION_SYMBOL_UPDATE_STATUSES)[number];

export interface CorporateActionSymbolUpdateQuery {
  readonly symbols?: readonly string[];
  readonly asOf?: Date;
  readonly start?: string;
}

export interface CorporateActionSymbolUpdateItem {
  readonly corporateActionId: string;
  readonly processDate: Date;
  readonly oldSymbol: string;
  readonly newSymbol: string;
  readonly status: CorporateActionSymbolUpdateStatus;
  readonly updatedPlatformOrderCount: number;
}

export interface CorporateActionSymbolUpdateResult {
  readonly asOf: Date;
  readonly items: readonly CorporateActionSymbolUpdateItem[];
  readonly updatedEventCount: number;
  readonly noLocalReferencesCount: number;
  readonly nameOnlyCount: number;
  readonly updatedPlatformOrderCount: number;
}