import { Inject, Injectable } from '@nestjs/common';
import {
  cloneStrategySignalInvalidation,
  createStrategySignalInvalidation,
} from './signal-invalidation';
import type { StrategySignal } from './strategy.types';
import type {
  PersistedStrategySignal,
  StrategySignalCooldownLookup,
  StrategySignalDeduplicationLookup,
  StrategySignalFrequencyLookup,
  StrategySignalHistoryQuery,
  StrategySignalTotalLimitLookup,
} from './strategy-signal-persistence.types';
import {
  STRATEGY_SIGNAL_REPOSITORY,
  type StrategySignalRepository,
} from './strategy-signal.repository';

@Injectable()
export class StrategySignalPersistenceService {
  constructor(
    @Inject(STRATEGY_SIGNAL_REPOSITORY)
    private readonly repository: StrategySignalRepository,
  ) {}

  async persist(signal: StrategySignal): Promise<PersistedStrategySignal> {
    return this.repository.save(this.cloneSignal(signal));
  }

  async getBySignalId(
    signalId: string,
  ): Promise<PersistedStrategySignal | null> {
    const result = await this.repository.findBySignalId(signalId);

    return result === null ? null : this.clonePersistedSignal(result);
  }

  async getHistory(
    query: StrategySignalHistoryQuery,
  ): Promise<readonly PersistedStrategySignal[]> {
    const results = await this.repository.findHistory(query);

    return results.map((result) => this.clonePersistedSignal(result));
  }

  async getLatestForCooldown(
    lookup: StrategySignalCooldownLookup,
  ): Promise<PersistedStrategySignal | null> {
    const results = await this.repository.findHistory({
      strategyId: lookup.strategyId,
      strategyVersion: lookup.strategyVersion,
      symbol: lookup.symbol,
      action: lookup.action,
      limit: 1,
    });

    const result = results[0];

    return result === undefined ? null : this.clonePersistedSignal(result);
  }

  async getByDeduplicationIdentity(
    lookup: StrategySignalDeduplicationLookup,
  ): Promise<PersistedStrategySignal | null> {
    const results = await this.repository.findHistory({
      strategyId: lookup.strategyId,
      strategyVersion: lookup.strategyVersion,
      symbol: lookup.symbol,
      action: lookup.action,
      evaluatedAt: new Date(lookup.evaluatedAt.getTime()),
      limit: 1,
    });

    const result = results[0];

    return result === undefined ? null : this.clonePersistedSignal(result);
  }

  async countForFrequency(
    lookup: StrategySignalFrequencyLookup,
  ): Promise<number> {
    return this.repository.countForFrequency({
      strategyId: lookup.strategyId,
      strategyVersion: lookup.strategyVersion,
      windowStart: new Date(lookup.windowStart.getTime()),
      referenceAt: new Date(lookup.referenceAt.getTime()),
    });
  }

  async countForTotalLimit(
    lookup: StrategySignalTotalLimitLookup,
  ): Promise<number> {
    return this.repository.countForTotalLimit({
      strategyId: lookup.strategyId,
      strategyVersion: lookup.strategyVersion,
    });
  }
  async invalidate(
    signalId: string,
    invalidatedAt: Date,
    reason: string,
  ): Promise<PersistedStrategySignal> {
    const invalidation = createStrategySignalInvalidation(
      invalidatedAt,
      reason,
    );

    const result = await this.repository.invalidate(signalId, invalidation);

    return this.clonePersistedSignal(result);
  }

  private cloneSignal(signal: StrategySignal): StrategySignal {
    return {
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
      invalidation:
        signal.invalidation === null
          ? null
          : cloneStrategySignalInvalidation(signal.invalidation),
    };
  }

  private clonePersistedSignal(
    signal: PersistedStrategySignal,
  ): PersistedStrategySignal {
    return {
      ...this.cloneSignal(signal),
      createdAt: new Date(signal.createdAt.getTime()),
    };
  }
}

