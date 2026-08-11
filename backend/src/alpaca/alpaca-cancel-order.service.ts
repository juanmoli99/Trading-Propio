import { Injectable } from '@nestjs/common';
import { AlpacaHttpClient } from './alpaca-http-client.service';
import type { AlpacaCancelAllOrderResult } from './alpaca-cancel-order.types';

interface AlpacaCancelAllApiResponse {
  id?: unknown;
  status?: unknown;
}

@Injectable()
export class AlpacaCancelOrderService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async cancelOrder(orderId: string): Promise<void> {
    this.assertPaperMode();

    const normalizedOrderId = this.normalizeOrderId(orderId);

    const response = await this.httpClient.request<unknown>({
      method: 'DELETE',
      path: `/v2/orders/${encodeURIComponent(normalizedOrderId)}`,
      consumer: 'EXECUTOR',
    });

    if (response.status !== 204) {
      throw new Error(
        `Unexpected Alpaca cancel order status: ${response.status}`,
      );
    }
  }

  async cancelAllOrders(): Promise<AlpacaCancelAllOrderResult[]> {
    this.assertPaperMode();

    const response = await this.httpClient.request<
      AlpacaCancelAllApiResponse[]
    >({
      method: 'DELETE',
      path: '/v2/orders',
      consumer: 'EXECUTOR',
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid Alpaca cancel-all response');
    }

    return response.data.map((item) => this.normalizeCancelResult(item));
  }

  private normalizeCancelResult(
    value: AlpacaCancelAllApiResponse,
  ): AlpacaCancelAllOrderResult {
    if (typeof value.id !== 'string' || !value.id.trim()) {
      throw new Error('Invalid Alpaca cancel-all order id');
    }

    if (
      typeof value.status !== 'number' ||
      !Number.isInteger(value.status) ||
      value.status < 100 ||
      value.status > 599
    ) {
      throw new Error('Invalid Alpaca cancel-all status');
    }

    return {
      id: value.id,
      status: value.status,
    };
  }

  private normalizeOrderId(orderId: string): string {
    const normalized = orderId.trim();

    if (!normalized) {
      throw new Error('Alpaca order ID is required');
    }

    return normalized;
  }

  private assertPaperMode(): void {
    if (this.httpClient.getTradingMode() !== 'PAPER') {
      throw new Error(
        'Alpaca order cancellation is disabled outside PAPER mode',
      );
    }
  }
}
