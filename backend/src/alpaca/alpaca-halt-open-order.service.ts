import { Injectable } from '@nestjs/common';
import { MarketDataHaltDetectionService } from '../market-data/market-data-halt-detection.service';
import type { AlpacaOrder } from './alpaca-order.types';
import { AlpacaOrderService } from './alpaca-order.service';
import type {
  AlpacaHaltAffectedOpenOrder,
  AlpacaHaltOpenOrderManagementResult,
} from './alpaca-halt-open-order.types';

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
export class AlpacaHaltOpenOrderService {
  constructor(
    private readonly orderService: AlpacaOrderService,
    private readonly haltDetectionService: MarketDataHaltDetectionService,
  ) {}

  async inspect(symbol: string): Promise<AlpacaHaltOpenOrderManagementResult> {
    const halt = this.haltDetectionService.detect(symbol);

    if (halt.state === 'UNKNOWN') {
      throw new Error(
        `Cannot safely inspect halt-affected orders because halt state is unknown for ${halt.symbol}`,
      );
    }

    if (halt.state === 'NOT_HALTED') {
      return {
        symbol: halt.symbol,
        state: 'NOT_HALTED',
        haltedAt: null,
        haltReason: null,
        openOrders: [],
        automaticActionTaken: false,
      };
    }

    const orders = await this.orderService.getOrders({
      status: 'open',
      symbols: halt.symbol,
      nested: true,
    });

    const affectedOrders = orders
      .filter(
        (order) =>
          order.symbol.trim().toUpperCase() === halt.symbol,
      )
      .map((order) => this.toAffectedOrder(order));

    return {
      symbol: halt.symbol,
      state:
        affectedOrders.length === 0
          ? 'NO_OPEN_ORDERS'
          : 'REVIEW_REQUIRED',
      haltedAt: halt.haltedAt
        ? new Date(halt.haltedAt)
        : null,
      haltReason: halt.haltReason
        ? { ...halt.haltReason }
        : null,
      openOrders: affectedOrders,
      automaticActionTaken: false,
    };
  }

  private toAffectedOrder(
    order: AlpacaOrder,
  ): AlpacaHaltAffectedOpenOrder {
    const normalizedStatus = order.status.trim().toLowerCase();

    return {
      orderId: order.id,
      clientOrderId: order.clientOrderId,
      symbol: order.symbol.trim().toUpperCase(),
      side: order.side,
      type: order.type,
      timeInForce: order.timeInForce,
      status: order.status,
      quantity: order.quantity,
      notional: order.notional,
      filledQuantity: order.filledQuantity,
      cancelable: CANCELABLE_ORDER_STATUSES.has(normalizedStatus),
      automaticActionTaken: false,
    };
  }
}