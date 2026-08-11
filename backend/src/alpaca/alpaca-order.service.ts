import { Injectable } from '@nestjs/common';
import { AlpacaHttpClient } from './alpaca-http-client.service';
import {
  normalizeAlpacaOrder,
  normalizeAlpacaOrders,
  type AlpacaOrderApiResponse,
} from './alpaca-order.mapper';
import type { AlpacaOrder } from './alpaca-order.types';

export type AlpacaOrderListStatus = 'open' | 'closed' | 'all';

export interface AlpacaOrderListOptions {
  readonly status?: AlpacaOrderListStatus;
  readonly limit?: number;
  readonly after?: string;
  readonly until?: string;
  readonly direction?: 'asc' | 'desc';
  readonly nested?: boolean;
  readonly symbols?: string;
}

@Injectable()
export class AlpacaOrderService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async getOrders(
    options: AlpacaOrderListOptions = {},
  ): Promise<AlpacaOrder[]> {
    this.validateOptions(options);

    const response = await this.httpClient.request<AlpacaOrderApiResponse[]>({
      method: 'GET',
      path: '/v2/orders',
      consumer: 'SYSTEM',
      query: {
        status: options.status,
        limit: options.limit,
        after: options.after,
        until: options.until,
        direction: options.direction,
        nested: options.nested,
        symbols: options.symbols,
      },
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid Alpaca orders response');
    }

    return normalizeAlpacaOrders(response.data);
  }

  async getOrder(orderId: string): Promise<AlpacaOrder> {
    const normalizedOrderId = orderId.trim();

    if (!normalizedOrderId) {
      throw new Error('Alpaca order ID is required');
    }

    const response = await this.httpClient.request<AlpacaOrderApiResponse>({
      method: 'GET',
      path: `/v2/orders/${encodeURIComponent(normalizedOrderId)}`,
      consumer: 'SYSTEM',
    });

    return normalizeAlpacaOrder(response.data);
  }

  private validateOptions(options: AlpacaOrderListOptions): void {
    if (
      options.limit !== undefined &&
      (!Number.isInteger(options.limit) ||
        options.limit < 1 ||
        options.limit > 500)
    ) {
      throw new Error('Alpaca orders limit must be between 1 and 500');
    }

    if (options.after !== undefined) {
      this.validateTimestamp(options.after, 'after');
    }

    if (options.until !== undefined) {
      this.validateTimestamp(options.until, 'until');
    }
  }

  private validateTimestamp(value: string, field: string): void {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid Alpaca orders ${field} timestamp`);
    }
  }
}
