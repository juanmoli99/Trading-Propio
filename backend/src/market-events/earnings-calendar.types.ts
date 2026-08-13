export const EARNINGS_SESSIONS = [
  'PRE_MARKET',
  'DURING_MARKET',
  'POST_MARKET',
  'UNKNOWN',
] as const;

export type EarningsSession = (typeof EARNINGS_SESSIONS)[number];

export interface EarningsCalendarQuery {
  readonly start: string;
  readonly end: string;
  readonly symbols?: readonly string[];
}

export interface EarningsCalendarEvent {
  readonly symbol: string;
  readonly reportDate: string;
  readonly session: EarningsSession;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface EarningsCalendarResult {
  readonly start: string;
  readonly end: string;
  readonly events: readonly EarningsCalendarEvent[];
}
