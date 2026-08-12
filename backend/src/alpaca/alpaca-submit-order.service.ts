import { Injectable } from '@nestjs/common';
import { MarketDataHaltDetectionService } from '../market-data/market-data-halt-detection.service';
import { AlpacaAccountRestrictionGuardService } from './alpaca-account-restriction-guard.service';
import { AlpacaHttpClient } from './alpaca-http-client.service';
import { AlpacaOrderOwnershipService } from './alpaca-order-ownership.service';
import {
  normalizeAlpacaOrder,
  type AlpacaOrderApiResponse,
} from './alpaca-order.mapper';
import type { AlpacaOrder } from './alpaca-order.types';
import type { AlpacaSubmitOrderRequest } from './alpaca-submit-order.types';

interface AlpacaSubmitOrderBody {
  symbol: string;
  side: string;
  type: string;
  time_in_force: string;
  client_order_id: string;
  extended_hours: boolean;
  qty?: string;
  notional?: string;
  limit_price?: string;
}

@Injectable()
export class AlpacaSubmitOrderService {
  constructor(
    private readonly httpClient: AlpacaHttpClient,
    private readonly ownershipService: AlpacaOrderOwnershipService,
    private readonly accountRestrictionGuard: AlpacaAccountRestrictionGuardService,
    private readonly haltDetectionService: MarketDataHaltDetectionService,
  ) {}

  async submitOrder(request: AlpacaSubmitOrderRequest): Promise<AlpacaOrder> {
    this.assertPaperMode();

    const body = this.buildRequestBody(request);

    this.assertSymbolNotHalted(body.symbol);

    await this.accountRestrictionGuard.validateOrder(request);

    const response = await this.httpClient.request<AlpacaOrderApiResponse>({
      method: 'POST',
      path: '/v2/orders',
      consumer: 'EXECUTOR',
      body,
    });

    const order = normalizeAlpacaOrder(response.data);

    await this.ownershipService.registerPlatformOrder(order);

    return order;
  }

  private assertSymbolNotHalted(symbol: string): void {
    const halt = this.haltDetectionService.detect(symbol);

    if (halt.state !== 'HALTED') {
      return;
    }

    const reasonCode = halt.haltReason?.code.trim() ?? '';
    const reasonMessage = halt.haltReason?.message.trim() ?? '';

    const reason =
      reasonCode && reasonMessage
        ? `${reasonCode} - ${reasonMessage}`
        : reasonMessage || reasonCode || 'reason not provided by market data feed';

    const haltedAt =
      halt.haltedAt?.toISOString() ?? 'timestamp unavailable';

    throw new Error(
      `New Alpaca order blocked because ${halt.symbol} is halted since ${haltedAt}: ${reason}`,
    );
  }

  private buildRequestBody(
    request: AlpacaSubmitOrderRequest,
  ): AlpacaSubmitOrderBody {
    const symbol = this.normalizeSymbol(request.symbol);

    const clientOrderId = this.normalizeClientOrderId(request.clientOrderId);

    this.validateSizing(request);
    this.validateOrderType(request);
    this.validateExtendedHours(request);

    return {
      symbol,
      side: request.side,
      type: request.type,
      time_in_force: request.timeInForce,
      client_order_id: clientOrderId,
      extended_hours: request.extendedHours ?? false,
      qty: request.quantity,
      notional: request.notional,
      limit_price: request.limitPrice,
    };
  }

  private validateSizing(request: AlpacaSubmitOrderRequest): void {
    const hasQuantity = request.quantity !== undefined;

    const hasNotional = request.notional !== undefined;

    if (hasQuantity === hasNotional) {
      throw new Error(
        'Alpaca order requires exactly one of quantity or notional',
      );
    }

    if (request.quantity !== undefined) {
      this.requirePositiveDecimal(request.quantity, 'quantity');

      if (
        this.isFractional(request.quantity) &&
        (request.type !== 'market' || request.timeInForce !== 'day')
      ) {
        throw new Error(
          'Fractional Alpaca orders require market type and day time in force',
        );
      }
    }

    if (request.notional !== undefined) {
      this.requirePositiveDecimal(request.notional, 'notional');

      if (request.type !== 'market' || request.timeInForce !== 'day') {
        throw new Error(
          'Alpaca notional orders require market type and day time in force',
        );
      }
    }
  }

  private validateOrderType(request: AlpacaSubmitOrderRequest): void {
    if (request.type === 'limit') {
      if (request.limitPrice === undefined) {
        throw new Error('Alpaca limit order requires limit price');
      }

      this.requirePositiveDecimal(request.limitPrice, 'limitPrice');

      return;
    }

    if (request.limitPrice !== undefined) {
      throw new Error('Alpaca market order cannot contain limit price');
    }
  }

  private validateExtendedHours(request: AlpacaSubmitOrderRequest): void {
    if (!request.extendedHours) {
      return;
    }

    if (request.type !== 'limit') {
      throw new Error('Alpaca extended-hours order must be a limit order');
    }

    if (request.timeInForce !== 'day' && request.timeInForce !== 'gtc') {
      throw new Error('Invalid Alpaca extended-hours time in force');
    }
  }

  private assertPaperMode(): void {
    if (this.httpClient.getTradingMode() !== 'PAPER') {
      throw new Error('Alpaca order submission is disabled outside PAPER mode');
    }
  }

  private normalizeSymbol(value: string): string {
    const symbol = value.trim().toUpperCase();

    if (!symbol || symbol.length > 32) {
      throw new Error('Invalid Alpaca order symbol');
    }

    return symbol;
  }

  private normalizeClientOrderId(value: string): string {
    const clientOrderId = value.trim();

    if (!clientOrderId || clientOrderId.length > 128) {
      throw new Error('Invalid Alpaca client order ID');
    }

    return clientOrderId;
  }

  private requirePositiveDecimal(value: string, field: string): void {
    if (
      !value.trim() ||
      !Number.isFinite(Number(value)) ||
      Number(value) <= 0
    ) {
      throw new Error(`Invalid Alpaca order ${field}`);
    }
  }

  private isFractional(value: string): boolean {
    return !Number.isInteger(Number(value));
  }
}