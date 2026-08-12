import type { AlpacaCalendarDay } from '../alpaca/alpaca-calendar.types';

export interface TimestampedMarketData {
  readonly timestamp: Date;
}

export interface MarketDataOutsideSessionItem {
  readonly timestamp: Date;
  readonly marketDate: string;
  readonly reason: 'NO_MARKET_SESSION' | 'BEFORE_OPEN' | 'AT_OR_AFTER_CLOSE';
}

export function detectMarketDataOutsideSession<T extends TimestampedMarketData>(
  items: readonly T[],
  calendar: readonly AlpacaCalendarDay[],
): MarketDataOutsideSessionItem[] {
  const calendarByDate = new Map(
    calendar.map((day) => [day.date, day] as const),
  );

  const outsideSession: MarketDataOutsideSessionItem[] = [];

  for (const item of items) {
    const parts = getNewYorkDateTimeParts(item.timestamp);

    const calendarDay = calendarByDate.get(parts.date);

    if (!calendarDay) {
      outsideSession.push({
        timestamp: new Date(item.timestamp),
        marketDate: parts.date,
        reason: 'NO_MARKET_SESSION',
      });

      continue;
    }

    const openMinutes = parseCalendarTime(calendarDay.open);
    const closeMinutes = parseCalendarTime(calendarDay.close);

    if (parts.minutes < openMinutes) {
      outsideSession.push({
        timestamp: new Date(item.timestamp),
        marketDate: parts.date,
        reason: 'BEFORE_OPEN',
      });

      continue;
    }

    if (parts.minutes >= closeMinutes) {
      outsideSession.push({
        timestamp: new Date(item.timestamp),
        marketDate: parts.date,
        reason: 'AT_OR_AFTER_CLOSE',
      });
    }
  }

  return outsideSession;
}

function parseCalendarTime(value: string): number {
  const [hourText, minuteText] = value.split(':');

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error('Invalid market calendar time');
  }

  return hour * 60 + minute;
}

function getNewYorkDateTimeParts(date: Date): {
  readonly date: string;
  readonly minutes: number;
} {
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Invalid market data timestamp');
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);

  const year = requirePart(parts, 'year');
  const month = requirePart(parts, 'month');
  const day = requirePart(parts, 'day');
  const hour = Number(requirePart(parts, 'hour'));
  const minute = Number(requirePart(parts, 'minute'));

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error('Invalid New York market time');
  }

  return {
    date: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  };
}

function requirePart(
  parts: readonly Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  const value = parts.find((part) => part.type === type)?.value;

  if (!value) {
    throw new Error(`Missing market time component: ${type}`);
  }

  return value;
}
