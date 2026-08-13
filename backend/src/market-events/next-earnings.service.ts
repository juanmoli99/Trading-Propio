import { Injectable } from '@nestjs/common';
import { EarningsCalendarService } from './earnings-calendar.service';
import type { EarningsCalendarEvent } from './earnings-calendar.types';
import type {
  NextEarningsQuery,
  NextEarningsResult,
} from './next-earnings.types';

const DEFAULT_LOOKAHEAD_DAYS = 365;
const MAX_LOOKAHEAD_DAYS = 730;

@Injectable()
export class NextEarningsService {
  constructor(
    private readonly earningsCalendarService: EarningsCalendarService,
  ) {}

  async getNextEarnings(query: NextEarningsQuery): Promise<NextEarningsResult> {
    const symbol = this.normalizeSymbol(query.symbol);
    const asOf = this.normalizeAsOf(query.asOf);
    const lookaheadDays = this.normalizeLookaheadDays(query.lookaheadDays);

    const start = this.toDateString(asOf);

    const endDate = new Date(asOf.getTime());

    endDate.setUTCDate(endDate.getUTCDate() + lookaheadDays);

    const end = this.toDateString(endDate);

    const calendar = await this.earningsCalendarService.getCalendar({
      start,
      end,
      symbols: [symbol],
    });

    const event = this.findNextEvent(calendar.events, symbol, asOf);

    return {
      symbol,
      asOf: new Date(asOf),
      lookaheadDays,
      event: event
        ? {
            ...event,
            raw: { ...event.raw },
          }
        : null,
    };
  }

  private findNextEvent(
    events: readonly EarningsCalendarEvent[],
    symbol: string,
    asOf: Date,
  ): EarningsCalendarEvent | null {
    const asOfDate = this.toDateString(asOf);

    const matching = events
      .filter(
        (event) =>
          event.symbol.trim().toUpperCase() === symbol &&
          event.reportDate >= asOfDate,
      )
      .sort((left, right) => left.reportDate.localeCompare(right.reportDate));

    return matching[0] ?? null;
  }

  private normalizeSymbol(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid next earnings symbol');
    }

    return normalized;
  }

  private normalizeAsOf(value: Date | undefined): Date {
    const resolved =
      value === undefined ? new Date() : new Date(value.getTime());

    if (!Number.isFinite(resolved.getTime())) {
      throw new Error('Invalid next earnings asOf date');
    }

    return resolved;
  }

  private normalizeLookaheadDays(value: number | undefined): number {
    const resolved = value ?? DEFAULT_LOOKAHEAD_DAYS;

    if (
      !Number.isInteger(resolved) ||
      resolved < 1 ||
      resolved > MAX_LOOKAHEAD_DAYS
    ) {
      throw new Error(
        `Next earnings lookaheadDays must be between 1 and ${MAX_LOOKAHEAD_DAYS}`,
      );
    }

    return resolved;
  }

  private toDateString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
