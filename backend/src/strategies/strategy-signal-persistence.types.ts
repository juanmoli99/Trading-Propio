import type { StrategySignal, StrategySignalAction } from './strategy.types';

export interface PersistedStrategySignal extends StrategySignal {
  readonly createdAt: Date;
}

export interface StrategySignalHistoryQuery {
  readonly strategyId: string;
  readonly strategyVersion?: string;
  readonly symbol?: string;
  readonly action?: StrategySignalAction;
  readonly evaluatedAt?: Date;
  readonly limit?: number;
}

export interface StrategySignalCooldownLookup {
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly symbol: string;
  readonly action: StrategySignalAction;
}

export interface StrategySignalDeduplicationLookup {
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly symbol: string;
  readonly action: StrategySignalAction;
  readonly evaluatedAt: Date;
}

export interface StrategySignalFrequencyLookup {
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly windowStart: Date;
  readonly referenceAt: Date;
}

export interface StrategySignalTotalLimitLookup {
  readonly strategyId: string;
  readonly strategyVersion: string;
}
