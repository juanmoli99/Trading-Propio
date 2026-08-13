import type { AlpacaPosition } from '../alpaca/alpaca-position.types';
import type {
  CorporateActionEffectiveQuery,
  CorporateActionEffectiveRecord,
} from './corporate-action-effective.types';

export interface CorporateActionPositionAssociationQuery
  extends CorporateActionEffectiveQuery {}

export interface CorporateActionPositionAssociation {
  readonly corporateAction: CorporateActionEffectiveRecord;
  readonly position: AlpacaPosition | null;
  readonly hasExistingPosition: boolean;
}

export interface CorporateActionPositionAssociationResult {
  readonly asOf: Date;
  readonly associations: readonly CorporateActionPositionAssociation[];
  readonly matchedCount: number;
  readonly unmatchedCount: number;
}