import { Injectable } from '@nestjs/common';
import type { AlpacaOrder } from '../alpaca/alpaca-order.types';
import { CorporateActionOpenOrderAssociationService } from './corporate-action-open-order-association.service';
import type { CorporateActionOpenOrderAssociation } from './corporate-action-open-order-association.types';
import type {
  CorporateActionPendingOrderReviewItem,
  CorporateActionPendingOrderReviewOrder,
  CorporateActionPendingOrderReviewQuery,
  CorporateActionPendingOrderReviewResult,
} from './corporate-action-pending-order-review.types';

const CANCELABLE_ORDER_STATUSES = new Set([
  'accepted',
  'new',
  'partially_filled',
  'calculated',
  'pending_new',
  'pending_cancel',
  'accepted_for_bidding',
]);

@Injectable()
export class CorporateActionPendingOrderReviewService {
  constructor(
    private readonly associationService: CorporateActionOpenOrderAssociationService,
  ) {}

  async reviewPendingOrders(
    query: CorporateActionPendingOrderReviewQuery = {},
  ): Promise<CorporateActionPendingOrderReviewResult> {
    const associationResult =
      await this.associationService.associateWithOpenOrders(query);

    const items = associationResult.associations.map((association) =>
      this.reviewAssociation(association),
    );

    return {
      asOf: new Date(associationResult.asOf),
      items,
      reviewRequiredCount: items.filter(
        (item) => item.status === 'REVIEW_REQUIRED',
      ).length,
      noOpenOrdersCount: items.filter(
        (item) => item.status === 'NO_OPEN_ORDERS',
      ).length,
      affectedOpenOrderCount: items.reduce(
        (total, item) => total + item.openOrders.length,
        0,
      ),
      cancelableOpenOrderCount: items.reduce(
        (total, item) =>
          total + item.openOrders.filter((order) => order.cancelable).length,
        0,
      ),
      automaticActionTaken: false,
    };
  }

  private reviewAssociation(
    association: CorporateActionOpenOrderAssociation,
  ): CorporateActionPendingOrderReviewItem {
    const action = association.corporateAction;

    const id = this.normalizeId(action.id);
    const processDate = this.cloneProcessDate(action.processDate, id);

    const symbol =
      action.symbol === null ? null : this.normalizeSymbol(action.symbol);

    const openOrders = association.openOrders.map((order) =>
      this.reviewOrder(order),
    );

    if (association.hasOpenOrders !== openOrders.length > 0) {
      throw new Error(
        `Inconsistent corporate action open-order association for ${id}`,
      );
    }

    return {
      corporateActionId: id,
      corporateActionType: action.type,
      symbol,
      processDate,
      status: openOrders.length > 0 ? 'REVIEW_REQUIRED' : 'NO_OPEN_ORDERS',
      openOrders,
      automaticActionTaken: false,
    };
  }

  private reviewOrder(
    order: AlpacaOrder,
  ): CorporateActionPendingOrderReviewOrder {
    const orderId = this.normalizeOrderId(order.id);

    const clientOrderId = this.normalizeClientOrderId(order.clientOrderId);

    const symbol = this.normalizeSymbol(order.symbol);

    const status = this.normalizeRequiredText(order.status, 'status', orderId);

    return {
      orderId,
      clientOrderId,
      symbol,
      side: this.normalizeRequiredText(order.side, 'side', orderId),
      type: this.normalizeRequiredText(order.type, 'type', orderId),
      timeInForce: this.normalizeRequiredText(
        order.timeInForce,
        'time in force',
        orderId,
      ),
      status,
      quantity: order.quantity,
      notional: order.notional,
      filledQuantity: this.normalizeRequiredText(
        order.filledQuantity,
        'filled quantity',
        orderId,
      ),
      cancelable: CANCELABLE_ORDER_STATUSES.has(status.toLowerCase()),
      automaticActionTaken: false,
    };
  }

  private cloneProcessDate(value: Date, id: string): Date {
    const processDate = new Date(value.getTime());

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Invalid corporate action pending order review process date for ${id}`,
      );
    }

    return processDate;
  }

  private normalizeId(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error('Invalid corporate action pending order review ID');
    }

    return normalized;
  }

  private normalizeOrderId(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error('Invalid corporate action pending order review order ID');
    }

    return normalized;
  }

  private normalizeClientOrderId(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(
        'Invalid corporate action pending order review client order ID',
      );
    }

    return normalized;
  }

  private normalizeRequiredText(
    value: string,
    field: string,
    orderId: string,
  ): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(
        `Invalid corporate action pending order review ${field} for order ${orderId}`,
      );
    }

    return normalized;
  }

  private normalizeSymbol(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid corporate action pending order review symbol');
    }

    return normalized;
  }
}
