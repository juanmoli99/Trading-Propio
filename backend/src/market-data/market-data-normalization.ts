const RFC3339_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function normalizeMarketDataSymbol(
  value: unknown,
  field = 'symbol',
): string {
  const symbol = requireMarketDataString(value, field).toUpperCase();

  if (symbol.length > 32) {
    throw new Error(`Invalid Alpaca market data symbol: ${field}`);
  }

  if (/\s/.test(symbol)) {
    throw new Error(`Invalid Alpaca market data symbol: ${field}`);
  }

  return symbol;
}

export function normalizeMarketDataResponseSymbol(
  value: unknown,
  expectedSymbol: string,
): string {
  const actual = normalizeMarketDataSymbol(value, 'symbol');

  const expected = normalizeMarketDataSymbol(expectedSymbol, 'expectedSymbol');

  if (actual !== expected) {
    throw new Error(
      `Alpaca market data symbol mismatch: expected ${expected}, received ${actual}`,
    );
  }

  return actual;
}

export function requireMarketDataString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid Alpaca market data field: ${field}`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Invalid Alpaca market data field: ${field}`);
  }

  return normalized;
}

export function optionalMarketDataString(
  value: unknown,
  field: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return requireMarketDataString(value, field);
}

export function requireMarketDataDate(value: unknown, field: string): Date {
  const text = requireMarketDataString(value, field);

  validateRfc3339Timestamp(text, field);

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Alpaca market data timestamp: ${field}`);
  }

  return parsed;
}

export function validateMarketDataHistoricalTimestamp(
  value: string,
  field: string,
): void {
  const text = requireMarketDataString(value, field);

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(text);

  if (dateOnlyMatch) {
    validateCalendarDate(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]),
      Number(dateOnlyMatch[3]),
      field,
    );

    return;
  }

  validateRfc3339Timestamp(text, field);
}

export function requireMarketDataNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid Alpaca market data number: ${field}`);
  }

  return value;
}

export function requirePositiveMarketDataNumber(
  value: unknown,
  field: string,
): number {
  const result = requireMarketDataNumber(value, field);

  if (result <= 0) {
    throw new Error(`Invalid Alpaca positive market data number: ${field}`);
  }

  return result;
}

export function requireNonNegativeMarketDataNumber(
  value: unknown,
  field: string,
): number {
  const result = requireMarketDataNumber(value, field);

  if (result < 0) {
    throw new Error(`Invalid Alpaca non-negative market data number: ${field}`);
  }

  return result;
}

export function requireNonNegativeMarketDataInteger(
  value: unknown,
  field: string,
): number {
  const result = requireNonNegativeMarketDataNumber(value, field);

  if (!Number.isInteger(result)) {
    throw new Error(`Invalid Alpaca market data integer: ${field}`);
  }

  return result;
}

export function requireNonNegativeSafeMarketDataInteger(
  value: unknown,
  field: string,
): number {
  const result = requireNonNegativeMarketDataNumber(value, field);

  if (!Number.isSafeInteger(result)) {
    throw new Error(`Invalid Alpaca market data safe integer: ${field}`);
  }

  return result;
}

export function requireMarketDataStringArray(
  value: unknown,
  field: string,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid Alpaca market data array: ${field}`);
  }

  return value.map((item) => requireMarketDataString(item, field));
}

function validateRfc3339Timestamp(value: string, field: string): void {
  const match = RFC3339_TIMESTAMP_PATTERN.exec(value);

  if (!match) {
    throw new Error(`Invalid Alpaca market data timestamp: ${field}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  validateCalendarDate(year, month, day, field);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new Error(`Invalid Alpaca market data timestamp: ${field}`);
  }

  const timezone = match[8];

  if (timezone !== 'Z') {
    const offsetHour = Number(timezone.slice(1, 3));
    const offsetMinute = Number(timezone.slice(4, 6));

    if (offsetHour > 23 || offsetMinute > 59) {
      throw new Error(`Invalid Alpaca market data timestamp: ${field}`);
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Alpaca market data timestamp: ${field}`);
  }
}

function validateCalendarDate(
  year: number,
  month: number,
  day: number,
  field: string,
): void {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1 ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(`Invalid Alpaca market data timestamp: ${field}`);
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (day < 1 || day > daysInMonth) {
    throw new Error(`Invalid Alpaca market data timestamp: ${field}`);
  }
}
