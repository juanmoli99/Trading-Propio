import type {
  CorporateActionRecord,
  CorporateActionType,
} from './corporate-actions.types';

export interface CorporateActionPendingQuery {
  readonly symbols?: readonly string[];
  readonly types?: readonly CorporateActionType[];
  readonly asOf?: Date;
  readonly end?: string;
}

export interface CorporateActionPendingRecord {
  readonly id: string;
  readonly type: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface CorporateActionPendingResult {
  readonly asOf: Date;
  readonly pending: readonly CorporateActionPendingRecord[];
}

export type CorporateActionPendingSourceRecord =
  CorporateActionRecord;