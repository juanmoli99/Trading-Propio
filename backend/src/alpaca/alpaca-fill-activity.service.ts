import { Injectable } from '@nestjs/common';
import {
  normalizeAlpacaFillActivities,
  type AlpacaFillActivityApiResponse,
} from './alpaca-fill-activity.mapper';
import type { AlpacaFillActivity } from './alpaca-fill-activity.types';
import { AlpacaHttpClient } from './alpaca-http-client.service';

export interface AlpacaFillActivityOptions {
  readonly orderId?: string;
  readonly date?: string;
  readonly after?: string;
  readonly until?: string;
  readonly direction?: 'asc' | 'desc';
  readonly pageSize?: number;
  readonly pageToken?: string;
}

@Injectable()
export class AlpacaFillActivityService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async getFills(
    options: AlpacaFillActivityOptions = {},
  ): Promise<AlpacaFillActivity[]> {
    this.validateOptions(options);

    const response = await this.httpClient.request<
      AlpacaFillActivityApiResponse[]
    >({
      method: 'GET',
      path: '/v2/account/activities/FILL',
      consumer: 'SYSTEM',
      query: {
        order_id: options.orderId,
        date: options.date,
        after: options.after,
        until: options.until,
        direction: options.direction,
        page_size: options.pageSize,
        page_token: options.pageToken,
      },
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid Alpaca fill activities response');
    }

    return normalizeAlpacaFillActivities(response.data);
  }

  private validateOptions(options: AlpacaFillActivityOptions): void {
    if (
      options.pageSize !== undefined &&
      (!Number.isInteger(options.pageSize) ||
        options.pageSize < 1 ||
        options.pageSize > 100)
    ) {
      throw new Error('Alpaca activities page size must be between 1 and 100');
    }

    this.validateOptionalDate(options.date, 'date');

    this.validateOptionalDate(options.after, 'after');

    this.validateOptionalDate(options.until, 'until');

    if (options.orderId !== undefined && !options.orderId.trim()) {
      throw new Error('Alpaca activity order ID cannot be empty');
    }

    if (options.pageToken !== undefined && !options.pageToken.trim()) {
      throw new Error('Alpaca activity page token cannot be empty');
    }
  }

  private validateOptionalDate(value: string | undefined, field: string): void {
    if (value === undefined) {
      return;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(`${value}T00:00:00Z`);

      if (!Number.isNaN(parsed.getTime())) {
        return;
      }
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid Alpaca activities ${field}`);
    }
  }
}
