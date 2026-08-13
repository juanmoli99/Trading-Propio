export const SYMBOL_RECORD_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
] as const;

export type SymbolRecordStatus = (typeof SYMBOL_RECORD_STATUSES)[number];

export interface TradingSymbol {
  readonly id: string;
  readonly symbol: string;
  readonly status: SymbolRecordStatus;

  readonly alpacaAssetId: string | null;
  readonly assetClass: string | null;
  readonly exchange: string | null;
  readonly name: string | null;
  readonly alpacaStatus: string | null;

  readonly tradable: boolean | null;
  readonly fractionable: boolean | null;
  readonly shortable: boolean | null;
  readonly easyToBorrow: boolean | null;

  readonly lastValidatedAt: Date | null;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateTradingSymbolInput {
  readonly symbol: string;
}

export interface TradingSymbolPersistenceRecord {
  readonly id: string;
  readonly symbol: string;
  readonly status: SymbolRecordStatus;

  readonly alpacaAssetId: string | null;
  readonly assetClass: string | null;
  readonly exchange: string | null;
  readonly name: string | null;
  readonly alpacaStatus: string | null;

  readonly tradable: boolean | null;
  readonly fractionable: boolean | null;
  readonly shortable: boolean | null;
  readonly easyToBorrow: boolean | null;

  readonly lastValidatedAt: Date | null;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
