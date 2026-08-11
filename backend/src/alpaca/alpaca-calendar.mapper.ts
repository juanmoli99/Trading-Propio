import type { AlpacaCalendarDay } from './alpaca-calendar.types';

interface AlpacaCalendarApiResponse {
  date?: unknown;
  open?: unknown;
  close?: unknown;
}

const REGULAR_CLOSE = '16:00';

export function normalizeAlpacaCalendar(
  values: readonly AlpacaCalendarApiResponse[],
): AlpacaCalendarDay[] {
  return values.map(normalizeCalendarDay);
}

function normalizeCalendarDay(
  value: AlpacaCalendarApiResponse,
): AlpacaCalendarDay {
  const date = requireDateString(value.date, 'date');

  const open = requireTimeString(value.open, 'open');

  const close = requireTimeString(value.close, 'close');

  return {
    date,
    open,
    close,
    isEarlyClose: compareTime(close, REGULAR_CLOSE) < 0,
  };
}

function requireDateString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid Alpaca calendar field: ${field}`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Alpaca calendar date: ${field}`);
  }

  return value;
}

function requireTimeString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    throw new Error(`Invalid Alpaca calendar field: ${field}`);
  }

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
    throw new Error(`Invalid Alpaca calendar time: ${field}`);
  }

  return value;
}

function compareTime(left: string, right: string): number {
  return timeToMinutes(left) - timeToMinutes(right);
}

function timeToMinutes(value: string): number {
  const [hourText, minuteText] = value.split(':');

  return Number(hourText) * 60 + Number(minuteText);
}
