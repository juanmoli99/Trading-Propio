import type {
  EarningsCalendarEvent,
  EarningsSession,
} from './earnings-calendar.types';

export const EARNINGS_POSITION_SIZE_REDUCTION_STATUSES = [
  'DISABLED',
  'NOT_APPLICABLE',
  'REDUCED',
] as const;

export type EarningsPositionSizeReductionStatus =
  (typeof EARNINGS_POSITION_SIZE_REDUCTION_STATUSES)[number];

export interface EarningsPositionSizeReductionInput {
  readonly event: EarningsCalendarEvent;
  readonly asOf?: Date;
}

export interface EarningsPositionSizeReductionResult {
  readonly symbol: string;
  readonly reportDate: string;
  readonly session: EarningsSession;
  readonly asOf: Date;
  readonly enabled: boolean;
  readonly reductionDays: number;
  readonly calendarDaysRemaining: number;
  readonly multiplier: number;
  readonly reduced: boolean;
  readonly status: EarningsPositionSizeReductionStatus;
  readonly reason: string;
}
