import type {
  CorporateActionRecord,
  CorporateActionType,
} from './corporate-actions.types';

export interface CorporateActionEffectiveQuery {
  readonly symbols?: readonly string[];
  readonly types?: readonly CorporateActionType[];
  readonly asOf?: Date;
  readonly start?: string;
}

export interface CorporateActionEffectiveRecord {
  readonly id: string;
  readonly type: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface CorporateActionEffectiveResult {
  readonly asOf: Date;
  readonly effective: readonly CorporateActionEffectiveRecord[];
}

export type CorporateActionEffectiveSourceRecord =
  CorporateActionRecord;