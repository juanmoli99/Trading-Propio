import type { StrategySignalInvalidation } from './signal-invalidation';
import type { StrategySignal } from './strategy.types';
import type {
  PersistedStrategySignal,
  StrategySignalFrequencyLookup,
  StrategySignalHistoryQuery,
  StrategySignalTotalLimitLookup,
} from './strategy-signal-persistence.types';

export const STRATEGY_SIGNAL_REPOSITORY = Symbol('STRATEGY_SIGNAL_REPOSITORY');

export interface StrategySignalRepository {
  save(signal: StrategySignal): Promise<PersistedStrategySignal>;

  findBySignalId(signalId: string): Promise<PersistedStrategySignal | null>;

  findHistory(
    query: StrategySignalHistoryQuery,
  ): Promise<readonly PersistedStrategySignal[]>;

  countForFrequency(lookup: StrategySignalFrequencyLookup): Promise<number>;

  countForTotalLimit(lookup: StrategySignalTotalLimitLookup): Promise<number>;

  invalidate(
    signalId: string,
    invalidation: StrategySignalInvalidation,
  ): Promise<PersistedStrategySignal>;
}
