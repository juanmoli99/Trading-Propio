import type { StrategyParameters } from './strategy-parameters.types';

export interface StrategySymbolOverrideIdentity {
  readonly strategyId: string;
  readonly strategyVersion: string;
  readonly symbol: string;
}

export interface StrategySymbolOverride extends StrategySymbolOverrideIdentity {
  readonly parameters: StrategyParameters;
}

export interface PersistedStrategySymbolOverride extends StrategySymbolOverride {
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
