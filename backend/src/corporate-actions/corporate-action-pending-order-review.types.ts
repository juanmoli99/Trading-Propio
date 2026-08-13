import type { CorporateActionType } from './corporate-actions.types';
import type { CorporateActionOpenOrderAssociationQuery } from './corporate-action-open-order-association.types';

export const CORPORATE_ACTION_PENDING_ORDER_REVIEW_STATUSES = [
  'REVIEW_REQUIRED',
  'NO_OPEN_ORDERS',
] as const;

export type CorporateActionPendingOrderReviewStatus =
  (typeof CORPORATE_ACTION_PENDING_ORDER_REVIEW_STATUSES)[number];

export interface CorporateActionPendingOrderReviewQuery extends CorporateActionOpenOrderAssociationQuery {}

export interface CorporateActionPendingOrderReviewOrder {
  readonly orderId: string;
  readonly clientOrderId: string;
  readonly symbol: string;
  readonly side: string;
  readonly type: string;
  readonly timeInForce: string;
  readonly status: string;
  readonly quantity: string | null;
  readonly notional: string | null;
  readonly filledQuantity: string;
  readonly cancelable: boolean;
  readonly automaticActionTaken: false;
}

export interface CorporateActionPendingOrderReviewItem {
  readonly corporateActionId: string;
  readonly corporateActionType: CorporateActionType;
  readonly symbol: string | null;
  readonly processDate: Date;
  readonly status: CorporateActionPendingOrderReviewStatus;
  readonly openOrders: readonly CorporateActionPendingOrderReviewOrder[];
  readonly automaticActionTaken: false;
}

export interface CorporateActionPendingOrderReviewResult {
  readonly asOf: Date;
  readonly items: readonly CorporateActionPendingOrderReviewItem[];
  readonly reviewRequiredCount: number;
  readonly noOpenOrdersCount: number;
  readonly affectedOpenOrderCount: number;
  readonly cancelableOpenOrderCount: number;
  readonly automaticActionTaken: false;
}
