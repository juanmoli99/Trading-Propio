import type {
  EarningsCalendarEvent,
  EarningsSession,
} from './earnings-calendar.types';

export const EARNINGS_BLACKOUT_BEFORE_STATUSES = [
  'ALLOWED',
  'BLACKED_OUT',
  'EVENT_ALREADY_PASSED',
] as const;

export type EarningsBlackoutBeforeStatus =
  (typeof EARNINGS_BLACKOUT_BEFORE_STATUSES)[number];

export interface EarningsBlackoutBeforeInput {
  readonly event: EarningsCalendarEvent;
  readonly asOf?: Date;
}

export interface EarningsBlackoutBeforeResult {
  readonly symbol: string;
  readonly reportDate: string;
  readonly session: EarningsSession;
  readonly asOf: Date;
  readonly blackoutBeforeDays: number;
  readonly calendarDaysRemaining: number;
  readonly blocked: boolean;
  readonly status: EarningsBlackoutBeforeStatus;
  readonly reason: string;
}
