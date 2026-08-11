import { Injectable } from '@nestjs/common';
import { normalizeAlpacaCalendar } from './alpaca-calendar.mapper';
import type { AlpacaCalendarDay } from './alpaca-calendar.types';
import { AlpacaHttpClient } from './alpaca-http-client.service';

interface AlpacaCalendarApiResponse {
  date?: unknown;
  open?: unknown;
  close?: unknown;
}

@Injectable()
export class AlpacaCalendarService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async getCalendar(start: string, end: string): Promise<AlpacaCalendarDay[]> {
    this.validateRange(start, end);

    const response = await this.httpClient.request<AlpacaCalendarApiResponse[]>(
      {
        method: 'GET',
        path: '/v2/calendar',
        consumer: 'SYSTEM',
        query: {
          start,
          end,
        },
      },
    );

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid Alpaca calendar response');
    }

    return normalizeAlpacaCalendar(response.data);
  }

  private validateRange(start: string, end: string): void {
    const startDate = this.parseDate(start, 'start');

    const endDate = this.parseDate(end, 'end');

    if (startDate.getTime() > endDate.getTime()) {
      throw new Error('Alpaca calendar start must not be after end');
    }
  }

  private parseDate(value: string, field: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`Invalid Alpaca calendar ${field} date`);
    }

    const parsed = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid Alpaca calendar ${field} date`);
    }

    return parsed;
  }
}
