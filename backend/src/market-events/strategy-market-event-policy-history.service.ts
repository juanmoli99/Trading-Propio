import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  PersistStrategyMarketEventPolicyInput,
  StrategyMarketEventPolicyHistoryQuery,
  StrategyMarketEventPolicyHistoryRecord,
} from './strategy-market-event-policy-history.types';

const DEFAULT_HISTORY_LIMIT = 100;
const MAX_HISTORY_LIMIT = 1000;

@Injectable()
export class StrategyMarketEventPolicyHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async persist(
    input: PersistStrategyMarketEventPolicyInput,
  ): Promise<StrategyMarketEventPolicyHistoryRecord> {
    this.validateConsistency(input);

    const corporateActionType =
      input.event.kind === 'CORPORATE_ACTION'
        ? input.event.corporateActionType
        : null;

    const created = await this.prisma.strategyMarketEventPolicyHistory.create({
      data: {
        strategyId: input.result.strategyId,
        symbol: input.result.symbol,
        eventKind: input.result.eventKind,
        eventDate: new Date(input.result.eventDate),
        eventSourceId: input.event.sourceId,
        corporateActionType,
        evaluatedAt: new Date(input.result.asOf),
        calendarDaysToEvent: input.result.calendarDaysToEvent,
        matchedRuleId: input.result.matchedRuleId,
        action: input.result.action,
        positionSizeMultiplier: input.result.positionSizeMultiplier,
        entryAllowed: input.result.entryAllowed,
        overnightAllowed: input.result.overnightAllowed,
        reason: input.result.reason,
      },
    });

    return this.mapRecord(created);
  }

  async getHistory(
    query: StrategyMarketEventPolicyHistoryQuery = {},
  ): Promise<readonly StrategyMarketEventPolicyHistoryRecord[]> {
    const strategyId =
      query.strategyId === undefined
        ? undefined
        : this.normalizeStrategyId(query.strategyId);

    const symbol =
      query.symbol === undefined
        ? undefined
        : this.normalizeSymbol(query.symbol);

    const limit = this.normalizeLimit(query.limit);

    const records = await this.prisma.strategyMarketEventPolicyHistory.findMany(
      {
        where: {
          strategyId,
          symbol,
        },
        orderBy: [
          {
            evaluatedAt: 'desc',
          },
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        take: limit,
      },
    );

    return records.map((record) => this.mapRecord(record));
  }

  private validateConsistency(
    input: PersistStrategyMarketEventPolicyInput,
  ): void {
    const resultSymbol = this.normalizeSymbol(input.result.symbol);

    const eventSymbol = this.normalizeSymbol(input.event.symbol);

    if (resultSymbol !== eventSymbol) {
      throw new Error('Market-event policy persistence symbol mismatch');
    }

    if (input.result.eventKind !== input.event.kind) {
      throw new Error('Market-event policy persistence event kind mismatch');
    }

    this.validateDate(input.result.eventDate, 'eventDate');

    this.validateDate(input.event.eventDate, 'source eventDate');

    if (input.result.eventDate.getTime() !== input.event.eventDate.getTime()) {
      throw new Error('Market-event policy persistence event date mismatch');
    }

    this.normalizeStrategyId(input.result.strategyId);

    this.validateDate(input.result.asOf, 'evaluatedAt');

    if (!Number.isInteger(input.result.calendarDaysToEvent)) {
      throw new Error('Invalid market-event policy calendarDaysToEvent');
    }

    if (
      !Number.isFinite(input.result.positionSizeMultiplier) ||
      input.result.positionSizeMultiplier <= 0 ||
      input.result.positionSizeMultiplier > 1
    ) {
      throw new Error('Invalid market-event policy positionSizeMultiplier');
    }

    if (!input.result.reason || input.result.reason.trim().length === 0) {
      throw new Error('Market-event policy persistence reason is required');
    }

    if (
      input.result.matchedRuleId !== null &&
      (input.result.matchedRuleId.trim().length === 0 ||
        input.result.matchedRuleId.length > 128)
    ) {
      throw new Error('Invalid market-event policy matchedRuleId');
    }
  }

  private mapRecord(record: {
    id: string;
    strategyId: string;
    symbol: string;
    eventKind: 'EARNINGS' | 'CORPORATE_ACTION';
    eventDate: Date;
    eventSourceId: string | null;
    corporateActionType: string | null;
    evaluatedAt: Date;
    calendarDaysToEvent: number;
    matchedRuleId: string | null;
    action:
      'ALLOW' | 'BLOCK_ENTRY' | 'REDUCE_POSITION_SIZE' | 'PROHIBIT_OVERNIGHT';
    positionSizeMultiplier: Prisma.Decimal;
    entryAllowed: boolean;
    overnightAllowed: boolean;
    reason: string;
    createdAt: Date;
  }): StrategyMarketEventPolicyHistoryRecord {
    const multiplier = record.positionSizeMultiplier.toNumber();

    if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1) {
      throw new Error('Persisted market-event policy multiplier is invalid');
    }

    return {
      id: record.id,

      strategyId: record.strategyId,

      symbol: record.symbol,

      eventKind: record.eventKind,

      eventDate: new Date(record.eventDate),

      eventSourceId: record.eventSourceId,

      corporateActionType:
        record.corporateActionType as StrategyMarketEventPolicyHistoryRecord['corporateActionType'],

      evaluatedAt: new Date(record.evaluatedAt),

      calendarDaysToEvent: record.calendarDaysToEvent,

      matchedRuleId: record.matchedRuleId,

      action: record.action,

      positionSizeMultiplier: multiplier,

      entryAllowed: record.entryAllowed,

      overnightAllowed: record.overnightAllowed,

      reason: record.reason,

      createdAt: new Date(record.createdAt),
    };
  }

  private normalizeStrategyId(value: string): string {
    const normalized = value.trim();

    if (!normalized || normalized.length > 128) {
      throw new Error('Invalid market-event policy strategy ID');
    }

    return normalized;
  }

  private normalizeSymbol(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid market-event policy symbol');
    }

    return normalized;
  }

  private normalizeLimit(value: number | undefined): number {
    const resolved = value ?? DEFAULT_HISTORY_LIMIT;

    if (
      !Number.isInteger(resolved) ||
      resolved < 1 ||
      resolved > MAX_HISTORY_LIMIT
    ) {
      throw new Error(
        `Market-event policy history limit must be between 1 and ${MAX_HISTORY_LIMIT}`,
      );
    }

    return resolved;
  }

  private validateDate(value: Date, field: string): void {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw new Error(`Invalid market-event policy ${field}`);
    }
  }
}
