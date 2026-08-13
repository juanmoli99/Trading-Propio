import type { SymbolRecordStatus } from '../symbols/symbol.types';

export interface WatchlistEntry {
  readonly id: string;
  readonly symbol: string;
  readonly tradingSymbolId: string | null;
  readonly status: SymbolRecordStatus;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface WatchlistPersistenceRecord {
  readonly id: string;
  readonly symbol: string;
  readonly tradingSymbolId: string | null;
  readonly status: SymbolRecordStatus;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateWatchlistPersistenceInput {
  readonly symbol: string;
  readonly tradingSymbolId?: string | null;
}

export interface UpdateWatchlistPersistenceInput {
  readonly tradingSymbolId?: string | null;
  readonly status?: SymbolRecordStatus;
}
