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
        configurationSnapshot: signal.configurationSnapshot,
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
    const records = await this.prisma.strategySignalRecord.findMany({
      where: {
        strategyId: this.normalizeStrategyId(query.strategyId),
        ...(query.strategyVersion === undefined
          ? {}
          : {
              strategyVersion: this.normalizeStrategyVersion(
                query.strategyVersion,
              ),
            }),
        ...(query.symbol === undefined
          ? {}
          : {
              symbol: this.normalizeSymbol(query.symbol),
            }),
        ...(query.action === undefined
          ? {}
          : {
              action: this.normalizeAction(query.action),
            }),
        ...(query.evaluatedAt === undefined
          ? {}
          : {
              evaluatedAt: this.normalizeFrequencyDate(
                query.evaluatedAt,
                'evaluation timestamp',
              ),
            }),
      },
      orderBy: [
        {
          signalAt: 'desc',
        },
        {
          signalId: 'desc',
        },
      ],
      take: this.normalizeLimit(query.limit),
    });

    return records.map((record) => this.toDomain(record));
  }

  async countForFrequency(
    lookup: StrategySignalFrequencyLookup,
  ): Promise<number> {
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
        strategyId: this.normalizeStrategyId(lookup.strategyId),
        strategyVersion: this.normalizeStrategyVersion(
          lookup.strategyVersion,
        ),
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
    return this.prisma.strategySignalRecord.count({
      where: {
        strategyId: this.normalizeStrategyId(lookup.strategyId),
        strategyVersion: this.normalizeStrategyVersion(
          lookup.strategyVersion,
        ),
      },
    });
  }

  async invalidate(
    signalId: string,
    invalidation: StrategySignalInvalidation,
  ): Promise<PersistedStrategySignal> {
    const updateResult = await this.prisma.strategySignalRecord.updateMany({
      where: {
        signalId: this.normalizeSignalId(signalId),
        invalidatedAt: null,
        invalidationReason: null,
      },
      data: {
        invalidatedAt: invalidation.invalidatedAt,
        invalidationReason: invalidation.reason,
      },
    });

    if (updateResult.count !== 0 && updateResult.count !== 1) {
      throw new Error('Unexpected strategy signal invalidation update count');
    }

    const record = await this.prisma.strategySignalRecord.findUnique({
      where: {
        signalId,
      },
    });

    if (record === null) {
      throw new Error('Strategy signal not found');
    }

    return this.toDomain(record);
  }

  private toDomain(record: {
    signalId: string;
    signalAt: Date;
    expiresAt: Date;
    strategyId: string;
    strategyVersion: string;
    symbol: string;
    action: string;
    evaluatedAt: Date;
    confidence: unknown;
    reason: string;
    configurationSnapshot: unknown;
    invalidatedAt: Date | null;
    invalidationReason: string | null;
    createdAt: Date;
  }): PersistedStrategySignal {
    return {
      signalId: record.signalId,
      signalAt: record.signalAt,
      expiresAt: record.expiresAt,
      strategyId: record.strategyId,
      strategyVersion: record.strategyVersion,
      symbol: record.symbol,
      action: this.normalizeAction(record.action),
      evaluatedAt: record.evaluatedAt,
      confidence: Number(record.confidence),
      reason: record.reason,
      configurationSnapshot:
        record.configurationSnapshot as PersistedStrategySignal['configurationSnapshot'],
      invalidation:
        record.invalidatedAt === null
          ? null
          : createStrategySignalInvalidation(
              record.invalidatedAt,
              record.invalidationReason ?? '',
            ),
      createdAt: record.createdAt,
    };
  }

  private validateExpiration(signalAt: Date, expiresAt: Date): void {
    if (expiresAt.getTime() <= signalAt.getTime()) {
      throw new Error(
        'Strategy signal expiration must be after signal timestamp',
      );
    }
  }

  private normalizeSignalId(value: string): string {
    return value.trim().toLowerCase();
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
    return value.trim().toUpperCase();
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

  private normalizeFrequencyDate(value: Date, _field: string): Date {
    return new Date(value.getTime());
  }

  private normalizeLimit(value?: number): number {
    const resolved = value ?? DEFAULT_HISTORY_LIMIT;

    if (
      !Number.isInteger(resolved) ||
      resolved < 1 ||
      resolved > MAX_HISTORY_LIMIT
    ) {
      throw new Error('Invalid strategy signal history limit');
    }

    return resolved;
  }
}



