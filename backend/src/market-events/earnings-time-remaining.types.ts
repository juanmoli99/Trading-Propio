import type {
  EarningsCalendarEvent,
  EarningsSession,
} from './earnings-calendar.types';

export interface EarningsTimeRemainingInput {
  readonly event: EarningsCalendarEvent;
  readonly asOf?: Date;
}

export interface EarningsTimeRemainingResult {
  readonly symbol: string;
  readonly reportDate: string;
  readonly session: EarningsSession;
  readonly asOf: Date;
  readonly reportDateStart: Date;
  readonly millisecondsRemaining: number;
  readonly hoursRemaining: number;
  readonly daysRemaining: number;
  readonly calendarDaysRemaining: number;
  readonly isToday: boolean;
  readonly isPast: boolean;
}
