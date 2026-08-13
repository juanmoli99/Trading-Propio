import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosInstance } from 'axios';
import type {
  EarningsCalendarQuery,
  EarningsCalendarResult,
} from './earnings-calendar.types';
import type { EarningsDataProvider } from './earnings-data-provider.interface';
import { normalizeFinnhubEarningsCalendarResponse } from './finnhub-earnings.mapper';

@Injectable()
export class FinnhubEarningsProvider implements EarningsDataProvider {
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('finnhub.apiKey');

    const baseUrl = this.configService.get<string>('finnhub.baseUrl');

    const timeoutMs = this.configService.get<number>('finnhub.timeoutMs');

    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY is required');
    }

    if (!baseUrl) {
      throw new Error('Finnhub base URL is required');
    }

    if (
      timeoutMs === undefined ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 100 ||
      timeoutMs > 120000
    ) {
      throw new Error('Invalid Finnhub timeout');
    }

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
      headers: {
        'X-Finnhub-Token': apiKey,
      },
    });
  }

  async getCalendar(
    query: EarningsCalendarQuery,
  ): Promise<EarningsCalendarResult> {
    const response = await this.client.get<unknown>('/calendar/earnings', {
      params: {
        from: query.start,
        to: query.end,
        symbol: query.symbols?.length === 1 ? query.symbols[0] : undefined,
      },
    });

    const events = normalizeFinnhubEarningsCalendarResponse(response.data);

    const symbolSet =
      query.symbols === undefined
        ? null
        : new Set(query.symbols.map((symbol) => symbol.trim().toUpperCase()));

    return {
      start: query.start,
      end: query.end,
      events:
        symbolSet === null
          ? events
          : events.filter((event) => symbolSet.has(event.symbol)),
    };
  }
}
