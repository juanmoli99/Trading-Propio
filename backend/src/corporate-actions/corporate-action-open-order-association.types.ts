import type { AlpacaOrder } from '../alpaca/alpaca-order.types';
import type {
  CorporateActionEffectiveQuery,
  CorporateActionEffectiveRecord,
} from './corporate-action-effective.types';

export interface CorporateActionOpenOrderAssociationQuery
  extends CorporateActionEffectiveQuery {}

export interface CorporateActionOpenOrderAssociation {
  readonly corporateAction: CorporateActionEffectiveRecord;
  readonly openOrders: readonly AlpacaOrder[];
  readonly hasOpenOrders: boolean;
}

export interface CorporateActionOpenOrderAssociationResult {
  readonly asOf: Date;
  readonly associations: readonly CorporateActionOpenOrderAssociation[];
  readonly matchedActionCount: number;
  readonly unmatchedActionCount: number;
  readonly associatedOpenOrderCount: number;
}