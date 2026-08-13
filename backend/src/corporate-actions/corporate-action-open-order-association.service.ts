import { Injectable } from '@nestjs/common';
import { AlpacaOrderService } from '../alpaca/alpaca-order.service';
import type { AlpacaOrder } from '../alpaca/alpaca-order.types';
import { CorporateActionEffectiveService } from './corporate-action-effective.service';
import type { CorporateActionEffectiveRecord } from './corporate-action-effective.types';
import type {
  CorporateActionOpenOrderAssociation,
  CorporateActionOpenOrderAssociationQuery,
  CorporateActionOpenOrderAssociationResult,
} from './corporate-action-open-order-association.types';

@Injectable()
export class CorporateActionOpenOrderAssociationService {
  constructor(
    private readonly effectiveService: CorporateActionEffectiveService,
    private readonly orderService: AlpacaOrderService,
  ) {}

  async associateWithOpenOrders(
    query: CorporateActionOpenOrderAssociationQuery = {},
  ): Promise<CorporateActionOpenOrderAssociationResult> {
    const [effectiveResult, openOrders] = await Promise.all([
      this.effectiveService.getEffectiveActions(query),
      this.orderService.getOrders({
        status: 'open',
        nested: true,
      }),
    ]);

    const ordersBySymbol = this.indexOpenOrders(openOrders);

    const associations = effectiveResult.effective.map(
      (action) =>
        this.associateAction(
          action,
          ordersBySymbol,
        ),
    );

    const matchedActionCount = associations.filter(
      (association) => association.hasOpenOrders,
    ).length;

    const associatedOpenOrderCount = associations.reduce(
      (total, association) =>
        total + association.openOrders.length,
      0,
    );

    return {
      asOf: new Date(effectiveResult.asOf),
      associations,
      matchedActionCount,
      unmatchedActionCount:
        associations.length - matchedActionCount,
      associatedOpenOrderCount,
    };
  }

  private indexOpenOrders(
    orders: readonly AlpacaOrder[],
  ): ReadonlyMap<string, readonly AlpacaOrder[]> {
    const indexed = new Map<string, AlpacaOrder[]>();
    const seenOrderIds = new Set<string>();

    for (const order of orders) {
      const orderId = this.normalizeOrderId(order.id);

      if (seenOrderIds.has(orderId)) {
        throw new Error(
          `Duplicate Alpaca open order detected: ${orderId}`,
        );
      }

      seenOrderIds.add(orderId);

      const symbol = this.normalizeSymbol(order.symbol);
      const existing = indexed.get(symbol) ?? [];

      existing.push(this.cloneOrder(order));
      indexed.set(symbol, existing);
    }

    return indexed;
  }

  private associateAction(
    action: CorporateActionEffectiveRecord,
    ordersBySymbol: ReadonlyMap<
      string,
      readonly AlpacaOrder[]
    >,
  ): CorporateActionOpenOrderAssociation {
    if (action.symbol === null) {
      return {
        corporateAction: this.cloneAction(action),
        openOrders: [],
        hasOpenOrders: false,
      };
    }

    const symbol = this.normalizeSymbol(action.symbol);
    const orders = ordersBySymbol.get(symbol) ?? [];

    return {
      corporateAction: this.cloneAction(action),
      openOrders: orders.map((order) =>
        this.cloneOrder(order),
      ),
      hasOpenOrders: orders.length > 0,
    };
  }

  private cloneAction(
    action: CorporateActionEffectiveRecord,
  ): CorporateActionEffectiveRecord {
    return {
      id: action.id,
      type: action.type,
      symbol: action.symbol,
      processDate: new Date(action.processDate),
      raw: structuredClone(action.raw),
    };
  }

  private cloneOrder(order: AlpacaOrder): AlpacaOrder {
    return {
      ...order,
      submittedAt: this.cloneOptionalDate(
        order.submittedAt,
      ),
      acceptedAt: this.cloneOptionalDate(
        order.acceptedAt,
      ),
      filledAt: this.cloneOptionalDate(
        order.filledAt,
      ),
      canceledAt: this.cloneOptionalDate(
        order.canceledAt,
      ),
      expiredAt: this.cloneOptionalDate(
        order.expiredAt,
      ),
      replacedAt: this.cloneOptionalDate(
        order.replacedAt,
      ),
    };
  }

  private cloneOptionalDate(
    value: Date | null,
  ): Date | null {
    return value === null
      ? null
      : new Date(value.getTime());
  }

  private normalizeOrderId(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(
        'Invalid corporate action open order association order ID',
      );
    }

    return normalized;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        'Invalid corporate action open order association symbol',
      );
    }

    return normalized;
  }
}