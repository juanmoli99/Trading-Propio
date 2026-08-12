import type { AlpacaCalendarDay } from '../alpaca/alpaca-calendar.types';
import type { MarketDataTimeframe } from './market-data-timeframe';
import type {
  MarketDataBar,
  MarketDataMissingBarGap,
} from './market-data.types';

export function detectMissingMarketDataBars(
  bars: readonly MarketDataBar[],
  timeframe: MarketDataTimeframe,
  calendar: readonly AlpacaCalendarDay[],
): MarketDataMissingBarGap[] {
  const intervalMs = resolveFixedIntervalMs(timeframe);

  if (intervalMs === null || bars.length < 2) {
    return [];
  }

  const calendarByDate = new Map(
    calendar.map((day) => [day.date, day] as const),
  );

  const gaps: MarketDataMissingBarGap[] = [];

  for (let index = 1; index < bars.length; index += 1) {
    const previous = bars[index - 1];
    const current = bars[index];

    if (!previous || !current) {
      continue;
    }

    const previousParts = getNewYorkDateTimeParts(previous.timestamp);
    const currentParts = getNewYorkDateTimeParts(current.timestamp);

    if (previousParts.date !== currentParts.date) {
      continue;
    }

    const calendarDay = calendarByDate.get(previousParts.date);

    if (!calendarDay) {
      continue;
    }

    if (
      !isInsideRegularSession(previousParts.minutes, calendarDay) ||
      !isInsideRegularSession(currentParts.minutes, calendarDay)
    ) {
      continue;
    }

    const differenceMs = Math.abs(
      current.timestamp.getTime() - previous.timestamp.getTime(),
    );

    if (differenceMs <= intervalMs) {
      continue;
    }

    if (differenceMs % intervalMs !== 0) {
      continue;
    }

    const missingCount = differenceMs / intervalMs - 1;

    if (missingCount <= 0) {
      continue;
    }

    gaps.push({
      previousTimestamp: new Date(previous.timestamp),
      nextTimestamp: new Date(current.timestamp),
      missingCount,
      expectedIntervalMs: intervalMs,
    });
  }

  return gaps;
}

function resolveFixedIntervalMs(timeframe: MarketDataTimeframe): number | null {
  switch (timeframe.unit) {
    case 'Min':
      return timeframe.amount * 60_000;

    case 'Hour':
      return timeframe.amount * 60 * 60_000;

    case 'Day':
    case 'Week':
    case 'Month':
      return null;

    default:
      return null;
  }
}

function isInsideRegularSession(
  minutes: number,
  day: AlpacaCalendarDay,
): boolean {
  const openMinutes = parseCalendarTime(day.open);
  const closeMinutes = parseCalendarTime(day.close);

  return minutes >= openMinutes && minutes < closeMinutes;
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
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid market data bar timestamp');
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
