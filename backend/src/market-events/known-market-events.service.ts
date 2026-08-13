import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from '../corporate-actions/corporate-actions.service';
import type {
  CorporateActionRecord,
  CorporateActionType,
} from '../corporate-actions/corporate-actions.types';
import { NextEarningsService } from './next-earnings.service';
import type {
  KnownCorporateActionMarketEvent,
  KnownMarketEvent,
  KnownMarketEventQuery,
  KnownMarketEventResult,
} from './known-market-event.types';

const DEFAULT_LOOKAHEAD_DAYS = 365;
const MAX_LOOKAHEAD_DAYS = 730;

@Injectable()
export class KnownMarketEventsService {
  constructor(
    private readonly nextEarningsService: NextEarningsService,
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getKnownEvents(
    query: KnownMarketEventQuery,
  ): Promise<KnownMarketEventResult> {
    const symbol = this.normalizeSymbol(query.symbol);
    const asOf = this.normalizeAsOf(query.asOf);
    const lookaheadDays = this.normalizeLookaheadDays(query.lookaheadDays);

    const endDate = new Date(asOf.getTime());
    endDate.setUTCDate(endDate.getUTCDate() + lookaheadDays);

    const [earnings, corporateActions] = await Promise.all([
      this.nextEarningsService.getNextEarnings({
        symbol,
        asOf,
        lookaheadDays,
      }),
      this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        start: this.toDateString(asOf),
        end: this.toDateString(endDate),
        sort: 'asc',
      }),
    ]);

    const events: KnownMarketEvent[] = [];

    if (earnings.event !== null) {
      events.push({
        kind: 'EARNINGS',
        symbol,
        eventDate: this.parseDate(earnings.event.reportDate),
        sourceId: null,
      });
    }

    for (const action of corporateActions.items) {
      const event = this.toCorporateActionEvent(action, symbol);

      if (event !== null) {
        events.push(event);
      }
    }

    events.sort((left, right) => {
      const dateDifference =
        left.eventDate.getTime() - right.eventDate.getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return left.kind.localeCompare(right.kind);
    });

    return {
      symbol,
      asOf: new Date(asOf),
      lookaheadDays,
      events: events.map((event) => this.cloneEvent(event)),
    };
  }

  private toCorporateActionEvent(
    action: CorporateActionRecord,
    symbol: string,
  ): KnownCorporateActionMarketEvent | null {
    if (action.processDate === null || action.symbol === null) {
      return null;
    }

    if (action.symbol.trim().toUpperCase() !== symbol) {
      return null;
    }

    return {
      kind: 'CORPORATE_ACTION',
      symbol,
      eventDate: new Date(action.processDate),
      sourceId: action.id,
      corporateActionType: action.type as CorporateActionType,
    };
  }

  private cloneEvent(event: KnownMarketEvent): KnownMarketEvent {
    if (event.kind === 'EARNINGS') {
      return {
        ...event,
        eventDate: new Date(event.eventDate),
      };
    }

    return {
      ...event,
      eventDate: new Date(event.eventDate),
    };
  }

  private normalizeSymbol(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid known market event symbol');
    }

    return normalized;
  }

  private normalizeAsOf(value: Date | undefined): Date {
    const resolved =
      value === undefined ? new Date() : new Date(value.getTime());

    if (!Number.isFinite(resolved.getTime())) {
      throw new Error('Invalid known market event asOf date');
    }

    return resolved;
  }

  private normalizeLookaheadDays(value: number | undefined): number {
    const resolved = value ?? DEFAULT_LOOKAHEAD_DAYS;

    if (
      !Number.isInteger(resolved) ||
      resolved < 1 ||
      resolved > MAX_LOOKAHEAD_DAYS
    ) {
      throw new Error(
        `Known market event lookaheadDays must be between 1 and ${MAX_LOOKAHEAD_DAYS}`,
      );
    }

    return resolved;
  }

  private parseDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (!Number.isFinite(date.getTime())) {
      throw new Error('Invalid known market event date');
    }

    return date;
  }

  private toDateString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
