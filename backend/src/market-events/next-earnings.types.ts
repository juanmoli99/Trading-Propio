import type { EarningsCalendarEvent } from './earnings-calendar.types';

export interface NextEarningsQuery {
  readonly symbol: string;
  readonly asOf?: Date;
  readonly lookaheadDays?: number;
}

export interface NextEarningsResult {
  readonly symbol: string;
  readonly asOf: Date;
  readonly lookaheadDays: number;
  readonly event: EarningsCalendarEvent | null;
}
