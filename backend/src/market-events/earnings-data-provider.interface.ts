import type {
  EarningsCalendarQuery,
  EarningsCalendarResult,
} from './earnings-calendar.types';

export const EARNINGS_DATA_PROVIDER = Symbol('EARNINGS_DATA_PROVIDER');

export interface EarningsDataProvider {
  getCalendar(query: EarningsCalendarQuery): Promise<EarningsCalendarResult>;
}
