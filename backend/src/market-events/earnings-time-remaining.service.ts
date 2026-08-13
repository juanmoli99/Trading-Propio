import { Injectable } from '@nestjs/common';
import {
  EARNINGS_SESSIONS,
  type EarningsCalendarEvent,
} from './earnings-calendar.types';
import type {
  EarningsTimeRemainingInput,
  EarningsTimeRemainingResult,
} from './earnings-time-remaining.types';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

@Injectable()
export class EarningsTimeRemainingService {
  calculate(input: EarningsTimeRemainingInput): EarningsTimeRemainingResult {
    const event = this.normalizeEvent(input.event);
    const asOf = this.normalizeAsOf(input.asOf);
    const reportDateStart = this.parseReportDate(event.reportDate);

    const millisecondsRemaining = reportDateStart.getTime() - asOf.getTime();

    if (!Number.isFinite(millisecondsRemaining)) {
      throw new Error('Earnings time remaining produced a non-finite result');
    }

    const hoursRemaining = millisecondsRemaining / MILLISECONDS_PER_HOUR;

    const daysRemaining = millisecondsRemaining / MILLISECONDS_PER_DAY;

    if (!Number.isFinite(hoursRemaining) || !Number.isFinite(daysRemaining)) {
      throw new Error(
        'Earnings time remaining conversion produced a non-finite result',
      );
    }

    const asOfDateStart = this.startOfUtcDate(asOf);

    const calendarDaysRemaining =
      (reportDateStart.getTime() - asOfDateStart.getTime()) /
      MILLISECONDS_PER_DAY;

    if (!Number.isInteger(calendarDaysRemaining)) {
      throw new Error('Earnings calendar day calculation is inconsistent');
    }

    return {
      symbol: event.symbol,
      reportDate: event.reportDate,
      session: event.session,
      asOf: new Date(asOf),
      reportDateStart: new Date(reportDateStart),
      millisecondsRemaining,
      hoursRemaining,
      daysRemaining,
      calendarDaysRemaining,
      isToday: calendarDaysRemaining === 0,
      isPast: calendarDaysRemaining < 0,
    };
  }

  private normalizeEvent(event: EarningsCalendarEvent): EarningsCalendarEvent {
    const symbol = event.symbol.trim().toUpperCase();

    if (!symbol || symbol.length > 32 || /\s/.test(symbol)) {
      throw new Error('Invalid earnings time remaining symbol');
    }

    if (!EARNINGS_SESSIONS.includes(event.session)) {
      throw new Error('Invalid earnings time remaining session');
    }

    this.parseReportDate(event.reportDate);

    return {
      ...event,
      symbol,
      raw: { ...event.raw },
    };
  }

  private normalizeAsOf(value: Date | undefined): Date {
    const resolved =
      value === undefined ? new Date() : new Date(value.getTime());

    if (!Number.isFinite(resolved.getTime())) {
      throw new Error('Invalid earnings time remaining asOf date');
    }

    return resolved;
  }

  private parseReportDate(value: string): Date {
    const normalized = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new Error('Invalid earnings time remaining report date');
    }

    const parsed = new Date(`${normalized}T00:00:00.000Z`);

    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== normalized
    ) {
      throw new Error('Invalid earnings time remaining report date');
    }

    return parsed;
  }

  private startOfUtcDate(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
}
