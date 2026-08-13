import type {
  EarningsCalendarEvent,
  EarningsSession,
} from './earnings-calendar.types';

export const EARNINGS_BLACKOUT_AFTER_STATUSES = [
  'EVENT_NOT_OCCURRED',
  'BLACKED_OUT',
  'ALLOWED',
] as const;

export type EarningsBlackoutAfterStatus =
  (typeof EARNINGS_BLACKOUT_AFTER_STATUSES)[number];

export interface EarningsBlackoutAfterInput {
  readonly event: EarningsCalendarEvent;
  readonly asOf?: Date;
}

export interface EarningsBlackoutAfterResult {
  readonly symbol: string;
  readonly reportDate: string;
  readonly session: EarningsSession;
  readonly asOf: Date;
  readonly blackoutAfterDays: number;
  readonly calendarDaysSinceEarnings: number;
  readonly blocked: boolean;
  readonly status: EarningsBlackoutAfterStatus;
  readonly reason: string;
}
