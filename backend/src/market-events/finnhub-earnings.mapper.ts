import type {
  EarningsCalendarEvent,
  EarningsSession,
} from './earnings-calendar.types';

export interface FinnhubEarningsCalendarResponse {
  readonly earningsCalendar?: unknown;
}

export function normalizeFinnhubEarningsCalendarResponse(
  value: unknown,
): EarningsCalendarEvent[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid Finnhub earnings calendar response');
  }

  const response = value as FinnhubEarningsCalendarResponse;

  if (!Array.isArray(response.earningsCalendar)) {
    throw new Error('Invalid Finnhub earnings calendar collection');
  }

  return response.earningsCalendar.map(normalizeFinnhubEarningsEvent);
}

function normalizeFinnhubEarningsEvent(value: unknown): EarningsCalendarEvent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid Finnhub earnings calendar event');
  }

  const raw = {
    ...(value as Record<string, unknown>),
  };

  return {
    symbol: requireSymbol(raw.symbol),
    reportDate: requireDate(raw.date),
    session: normalizeSession(raw.hour),
    raw,
  };
}

function normalizeSession(value: unknown): EarningsSession {
  if (value === undefined || value === null) {
    return 'UNKNOWN';
  }

  if (typeof value !== 'string') {
    throw new Error('Invalid Finnhub earnings hour');
  }

  switch (value.trim().toLowerCase()) {
    case 'bmo':
      return 'PRE_MARKET';

    case 'amc':
      return 'POST_MARKET';

    case 'dmh':
      return 'DURING_MARKET';

    default:
      return 'UNKNOWN';
  }
}

function requireSymbol(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Invalid Finnhub earnings symbol');
  }

  const normalized = value.trim().toUpperCase();

  if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
    throw new Error('Invalid Finnhub earnings symbol');
  }

  return normalized;
}

function requireDate(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Invalid Finnhub earnings date');
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('Invalid Finnhub earnings date');
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error('Invalid Finnhub earnings date');
  }

  return normalized;
}
