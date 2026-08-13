import type {
  EarningsCalendarEvent,
  EarningsSession,
} from './earnings-calendar.types';

export const EARNINGS_OVERNIGHT_POLICY_STATUSES = [
  'DISABLED',
  'ALLOWED',
  'OVERNIGHT_PROHIBITED',
  'NOT_APPLICABLE',
] as const;

export type EarningsOvernightPolicyStatus =
  (typeof EARNINGS_OVERNIGHT_POLICY_STATUSES)[number];

export interface EarningsOvernightPolicyInput {
  readonly event: EarningsCalendarEvent;
  readonly asOf?: Date;
}

export interface EarningsOvernightPolicyResult {
  readonly symbol: string;
  readonly reportDate: string;
  readonly session: EarningsSession;
  readonly asOf: Date;
  readonly enabled: boolean;
  readonly prohibitionDays: number;
  readonly calendarDaysRemaining: number;
  readonly overnightAllowed: boolean;
  readonly mustExitBeforeOvernight: boolean;
  readonly status: EarningsOvernightPolicyStatus;
  readonly reason: string;
}
