import { Injectable } from '@nestjs/common';
import { AlpacaCalendarService } from '../alpaca/alpaca-calendar.service';
import { detectMissingMarketDataBars } from './market-data-missing-bars';
import type { MarketDataTimeframe } from './market-data-timeframe';
import type {
  MarketDataBar,
  MarketDataMissingBarGap,
} from './market-data.types';

@Injectable()
export class MarketDataMissingBarsService {
  constructor(private readonly calendarService: AlpacaCalendarService) {}

  async detect(
    bars: readonly MarketDataBar[],
    timeframe: MarketDataTimeframe,
  ): Promise<MarketDataMissingBarGap[]> {
    if (bars.length < 2 || !this.requiresCalendar(timeframe)) {
      return [];
    }

    const dates = bars.map((bar) => this.getNewYorkDate(bar.timestamp));

    dates.sort();

    const start = dates[0];
    const end = dates[dates.length - 1];

    if (!start || !end) {
      return [];
    }

    const calendar = await this.calendarService.getCalendar(start, end);

    return detectMissingMarketDataBars(bars, timeframe, calendar);
  }

  private requiresCalendar(timeframe: MarketDataTimeframe): boolean {
    return timeframe.unit === 'Min' || timeframe.unit === 'Hour';
  }

  private getNewYorkDate(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid market data bar timestamp');
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(date);

    const year = this.requirePart(parts, 'year');
    const month = this.requirePart(parts, 'month');
    const day = this.requirePart(parts, 'day');

    return `${year}-${month}-${day}`;
  }

  private requirePart(
    parts: readonly Intl.DateTimeFormatPart[],
    type: Intl.DateTimeFormatPartTypes,
  ): string {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new Error(`Missing market time component: ${type}`);
    }

    return value;
  }
}
