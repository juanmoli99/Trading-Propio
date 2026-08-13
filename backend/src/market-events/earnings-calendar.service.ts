import { Inject, Injectable } from '@nestjs/common';
import {
  EARNINGS_DATA_PROVIDER,
  type EarningsDataProvider,
} from './earnings-data-provider.interface';
import type {
  EarningsCalendarQuery,
  EarningsCalendarResult,
} from './earnings-calendar.types';

@Injectable()
export class EarningsCalendarService {
  constructor(
    @Inject(EARNINGS_DATA_PROVIDER)
    private readonly provider: EarningsDataProvider,
  ) {}

  async getCalendar(
    query: EarningsCalendarQuery,
  ): Promise<EarningsCalendarResult> {
    const start = this.normalizeDate(query.start, 'start');

    const end = this.normalizeDate(query.end, 'end');

    if (start > end) {
      throw new Error('Earnings calendar start must not be after end');
    }

    const symbols = this.normalizeSymbols(query.symbols);

    const result = await this.provider.getCalendar({
      start,
      end,
      symbols,
    });

    return {
      start,
      end,
      events: result.events.map((event) => ({
        ...event,
        raw: { ...event.raw },
      })),
    };
  }

  private normalizeSymbols(
    symbols: readonly string[] | undefined,
  ): readonly string[] | undefined {
    if (symbols === undefined) {
      return undefined;
    }

    if (symbols.length === 0) {
      throw new Error('Earnings calendar symbols cannot be empty');
    }

    const normalized = symbols.map((symbol) => {
      const value = symbol.trim().toUpperCase();

      if (!value || value.length > 32 || /\s/.test(value)) {
        throw new Error('Invalid earnings calendar symbol');
      }

      return value;
    });

    if (new Set(normalized).size !== normalized.length) {
      throw new Error('Duplicate earnings calendar symbol');
    }

    return normalized;
  }

  private normalizeDate(value: string, field: string): string {
    const normalized = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new Error(`Invalid earnings calendar ${field} date`);
    }

    const parsed = new Date(`${normalized}T00:00:00.000Z`);

    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== normalized
    ) {
      throw new Error(`Invalid earnings calendar ${field} date`);
    }

    return normalized;
  }
}
