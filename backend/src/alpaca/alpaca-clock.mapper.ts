import type { AlpacaClock } from './alpaca-clock.types';

interface AlpacaClockApiResponse {
  timestamp?: unknown;
  is_open?: unknown;
  next_open?: unknown;
  next_close?: unknown;
}

export function normalizeAlpacaClock(
  value: AlpacaClockApiResponse,
): AlpacaClock {
  const timestamp = requireDate(value.timestamp, 'timestamp');

  const nextOpen = requireDate(value.next_open, 'next_open');

  const nextClose = requireDate(value.next_close, 'next_close');

  const isOpen = requireBoolean(value.is_open, 'is_open');

  if (nextOpen.getTime() <= timestamp.getTime()) {
    throw new Error('Invalid Alpaca clock: next_open must be after timestamp');
  }

  if (nextClose.getTime() <= timestamp.getTime()) {
    throw new Error('Invalid Alpaca clock: next_close must be after timestamp');
  }

  return {
    timestamp,
    isOpen,
    nextOpen,
    nextClose,
  };
}

function requireDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca clock field: ${field}`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid Alpaca clock date: ${field}`);
  }

  return date;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid Alpaca clock field: ${field}`);
  }

  return value;
}
