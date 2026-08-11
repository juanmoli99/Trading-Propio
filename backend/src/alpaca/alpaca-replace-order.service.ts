import { Injectable } from '@nestjs/common';
import { AlpacaHttpClient } from './alpaca-http-client.service';
import {
  normalizeAlpacaOrder,
  type AlpacaOrderApiResponse,
} from './alpaca-order.mapper';
import type { AlpacaOrder } from './alpaca-order.types';
import type { AlpacaReplaceOrderRequest } from './alpaca-replace-order.types';

interface AlpacaReplaceOrderBody {
  qty?: string;
  time_in_force?: 'day' | 'gtc';
  limit_price?: string;
  stop_price?: string;
  client_order_id?: string;
}

@Injectable()
export class AlpacaReplaceOrderService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async replaceOrder(
    orderId: string,
    request: AlpacaReplaceOrderRequest,
  ): Promise<AlpacaOrder> {
    this.assertPaperMode();

    const normalizedOrderId = this.normalizeOrderId(orderId);

    const body = this.buildRequestBody(request);

    const response = await this.httpClient.request<AlpacaOrderApiResponse>({
      method: 'PATCH',
      path: `/v2/orders/${encodeURIComponent(normalizedOrderId)}`,
      consumer: 'EXECUTOR',
      body,
    });

    return normalizeAlpacaOrder(response.data);
  }

  private buildRequestBody(
    request: AlpacaReplaceOrderRequest,
  ): AlpacaReplaceOrderBody {
    const hasAnyField =
      request.quantity !== undefined ||
      request.timeInForce !== undefined ||
      request.limitPrice !== undefined ||
      request.stopPrice !== undefined ||
      request.clientOrderId !== undefined;

    if (!hasAnyField) {
      throw new Error('Alpaca replace order requires at least one field');
    }

    if (request.quantity !== undefined) {
      this.requirePositiveDecimal(request.quantity, 'quantity');
    }

    if (request.limitPrice !== undefined) {
      this.requirePositiveDecimal(request.limitPrice, 'limitPrice');
    }

    if (request.stopPrice !== undefined) {
      this.requirePositiveDecimal(request.stopPrice, 'stopPrice');
    }

    const clientOrderId =
      request.clientOrderId === undefined
        ? undefined
        : this.normalizeClientOrderId(request.clientOrderId);

    return {
      qty: request.quantity,
      time_in_force: request.timeInForce,
      limit_price: request.limitPrice,
      stop_price: request.stopPrice,
      client_order_id: clientOrderId,
    };
  }

  private normalizeOrderId(value: string): string {
    const orderId = value.trim();

    if (!orderId) {
      throw new Error('Alpaca order ID is required');
    }

    return orderId;
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
      throw new Error(`Invalid Alpaca replacement ${field}`);
    }
  }

  private assertPaperMode(): void {
    if (this.httpClient.getTradingMode() !== 'PAPER') {
      throw new Error(
        'Alpaca order replacement is disabled outside PAPER mode',
      );
    }
  }
}
