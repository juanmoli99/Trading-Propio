import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  createStrategySignalInvalidation,
  type StrategySignalInvalidation,
} from './signal-invalidation';
import type { StrategySignal, StrategySignalAction } from './strategy.types';
import type {
  PersistedStrategySignal,
  StrategySignalFrequencyLookup,
  StrategySignalHistoryQuery,
  StrategySignalTotalLimitLookup,
} from './strategy-signal-persistence.types';
import type { StrategySignalRepository } from './strategy-signal.repository';

const DEFAULT_HISTORY_LIMIT = 100;
const MAX_HISTORY_LIMIT = 500;

@Injectable()
export class PrismaStrategySignalRepository implements StrategySignalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(signal: StrategySignal): Promise<PersistedStrategySignal> {
    this.validateExpiration(signal.signalAt, signal.expiresAt);

    const createResult = await this.prisma.strategySignalRecord.createMany({
      data: {
        signalId: signal.signalId,
        signalAt: new Date(signal.signalAt.getTime()),
        expiresAt: new Date(signal.expiresAt.getTime()),
        strategyId: signal.strategyId,
        strategyVersion: signal.strategyVersion,
        symbol: signal.symbol,
        action: signal.action,
        evaluatedAt: new Date(signal.evaluatedAt.getTime()),
        confidence: signal.confidence,
        reason: signal.reason,
        invalidatedAt:
          signal.invalidation === null
            ? null
            : new Date(signal.invalidation.invalidatedAt.getTime()),
        invalidationReason: signal.invalidation?.reason ?? null,
      },
      skipDuplicates: true,
    });

    if (createResult.count !== 0 && createResult.count !== 1) {
      throw new Error('Unexpected strategy signal persistence insert count');
    }

    const record = await this.prisma.strategySignalRecord.findUnique({
      where: {
        strategyId_strategyVersion_symbol_action_evaluatedAt: {
          strategyId: signal.strategyId,
          strategyVersion: signal.strategyVersion,
          symbol: signal.symbol,
          action: signal.action,
          evaluatedAt: new Date(signal.evaluatedAt.getTime()),
        },
      },
    });

    if (record === null) {
      throw new Error(
        'Strategy signal could not be recovered after persistence',
      );
    }

    return this.toDomain(record);
  }

  async findBySignalId(
    signalId: string,
  ): Promise<PersistedStrategySignal | null> {
    const normalizedSignalId = this.normalizeSignalId(signalId);

    const record = await this.prisma.strategySignalRecord.findUnique({
      where: {
        signalId: normalizedSignalId,
      },
    });

    return record === null ? null : this.toDomain(record);
  }

  async findHistory(
    query: StrategySignalHistoryQuery,
  ): Promise<readonly PersistedStrategySignal[]> {
    const strategyId = this.normalizeStrategyId(query.strategyId);

    const strategyVersion =
      query.strategyVersion === undefined
        ? undefined
        : this.normalizeStrategyVersion(query.strategyVersion);

    const symbol =
      query.symbol === undefined
        ? undefined
        : this.normalizeSymbol(query.symbol);

    const action =
      query.action === undefined
        ? undefined
        : this.normalizeAction(query.action);

    const evaluatedAt =
      query.evaluatedAt === undefined
        ? undefined
        : this.normalizeFrequencyDate(
            query.evaluatedAt,
            'evaluation timestamp',
          );

    const limit = this.normalizeLimit(query.limit);

    const records = await this.prisma.strategySignalRecord.findMany({
      where: {
        strategyId,
        ...(strategyVersion === undefined ? {} : { strategyVersion }),
        ...(symbol === undefined ? {} : { symbol }),
        ...(action === undefined ? {} : { action }),
        ...(evaluatedAt === undefined ? {} : { evaluatedAt }),
      },
      orderBy: [
        {
          signalAt: 'desc',
        },
        {
          signalId: 'desc',
        },
      ],
      take: limit,
    });

    return records.map((record) => this.toDomain(record));
  }

  async countForFrequency(
    lookup: StrategySignalFrequencyLookup,
  ): Promise<number> {
    const strategyId = this.normalizeStrategyId(lookup.strategyId);

    const strategyVersion = this.normalizeStrategyVersion(
      lookup.strategyVersion,
    );

    const windowStart = this.normalizeFrequencyDate(
      lookup.windowStart,
      'window start',
    );

    const referenceAt = this.normalizeFrequencyDate(
      lookup.referenceAt,
      'reference timestamp',
    );

    if (windowStart.getTime() >= referenceAt.getTime()) {
      throw new Error(
        'Strategy signal frequency window start must precede reference timestamp',
      );
    }

    return this.prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion,
        signalAt: {
          gte: windowStart,
          lte: referenceAt,
        },
      },
    });
  }
  async countForTotalLimit(
    lookup: StrategySignalTotalLimitLookup,
  ): Promise<number> {
    const strategyId = this.normalizeStrategyId(lookup.strategyId);

    const strategyVersion = this.normalizeStrategyVersion(
      lookup.strategyVersion,
    );

    return this.prisma.strategySignalRecord.count({
      where: {
        strategyId,
        strategyVersion,
      },
    });
  }
  async invalidate(
    signalId: string,
    invalidation: StrategySignalInvalidation,
  ): Promise<PersistedStrategySignal> {
    const normalizedSignalId = this.normalizeSignalId(signalId);

    const normalizedInvalidation = createStrategySignalInvalidation(
      invalidation.invalidatedAt,
      invalidation.reason,
    );

    const updateResult = await this.prisma.strategySignalRecord.updateMany({
      where: {
        signalId: normalizedSignalId,
        invalidatedAt: null,
        invalidationReason: null,
      },
      data: {
        invalidatedAt: new Date(normalizedInvalidation.invalidatedAt.getTime()),
        invalidationReason: normalizedInvalidation.reason,
      },
    });

    if (updateResult.count !== 0 && updateResult.count !== 1) {
      throw new Error('Unexpected strategy signal invalidation update count');
    }

    const record = await this.prisma.strategySignalRecord.findUnique({
      where: {
        signalId: normalizedSignalId,
      },
    });

    if (record === null) {
      throw new Error('Strategy signal not found');
    }

    return this.toDomain(record);
  }

  private toDomain(record: {
    readonly signalId: string;
    readonly signalAt: Date;
    readonly expiresAt: Date;
    readonly strategyId: string;
    readonly strategyVersion: string;
    readonly symbol: string;
    readonly action: string;
    readonly evaluatedAt: Date;
    readonly confidence: unknown;
    readonly reason: string;
    readonly invalidatedAt: Date | null;
    readonly invalidationReason: string | null;
    readonly createdAt: Date;
  }): PersistedStrategySignal {
    const confidence = Number(record.confidence);

    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('Persisted strategy signal confidence is invalid');
    }

    this.validateExpiration(record.signalAt, record.expiresAt);

    const action = this.normalizeAction(record.action);

    return {
      signalId: record.signalId,
      signalAt: new Date(record.signalAt.getTime()),
      expiresAt: new Date(record.expiresAt.getTime()),
      strategyId: record.strategyId,
      strategyVersion: record.strategyVersion,
      symbol: record.symbol,
      action,
      evaluatedAt: new Date(record.evaluatedAt.getTime()),
      confidence,
      reason: record.reason,
      invalidation:
        record.invalidatedAt === null && record.invalidationReason === null
          ? null
          : record.invalidatedAt !== null && record.invalidationReason !== null
            ? createStrategySignalInvalidation(
                record.invalidatedAt,
                record.invalidationReason,
              )
            : (() => {
                throw new Error(
                  'Persisted strategy signal invalidation is inconsistent',
                );
              })(),
      createdAt: new Date(record.createdAt.getTime()),
    };
  }

  private validateExpiration(signalAt: Date, expiresAt: Date): void {
    if (!(signalAt instanceof Date) || !Number.isFinite(signalAt.getTime())) {
      throw new Error('Invalid persisted strategy signal timestamp');
    }

    if (!(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime())) {
      throw new Error('Invalid persisted strategy signal expiration');
    }

    if (expiresAt.getTime() <= signalAt.getTime()) {
      throw new Error(
        'Strategy signal expiration must be after signal timestamp',
      );
    }
  }

  private normalizeSignalId(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Invalid strategy signal ID');
    }

    const normalized = value.trim().toLowerCase();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalized,
      )
    ) {
      throw new Error('Invalid strategy signal ID');
    }

    return normalized;
  }

  private normalizeStrategyId(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Invalid strategy ID');
    }

    const normalized = value.trim();

    if (!normalized || normalized.length > 128) {
      throw new Error('Invalid strategy ID');
    }

    return normalized;
  }

  private normalizeStrategyVersion(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Invalid strategy version');
    }

    const normalized = value.trim();

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(normalized)) {
      throw new Error('Invalid strategy version');
    }

    return normalized;
  }

  private normalizeSymbol(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Invalid strategy signal symbol');
    }

    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid strategy signal symbol');
    }

    return normalized;
  }

  private normalizeAction(value: string): StrategySignalAction {
    if (
      value !== 'BUY' &&
      value !== 'SELL' &&
      value !== 'HOLD' &&
      value !== 'EXIT'
    ) {
      throw new Error('Invalid persisted strategy signal action');
    }

    return value;
  }

  private normalizeFrequencyDate(value: Date, field: string): Date {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw new Error(`Invalid strategy signal frequency ${field}`);
    }

    return new Date(value.getTime());
  }
  private normalizeLimit(value: number | undefined): number {
    const resolved = value ?? DEFAULT_HISTORY_LIMIT;

    if (
      !Number.isInteger(resolved) ||
      resolved < 1 ||
      resolved > MAX_HISTORY_LIMIT
    ) {
      throw new Error(
        `Strategy signal history limit must be between 1 and ${MAX_HISTORY_LIMIT}`,
      );
    }

    return resolved;
  }
}
