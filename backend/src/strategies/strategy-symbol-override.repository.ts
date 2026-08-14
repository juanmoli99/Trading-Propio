import type {
  PersistedStrategySymbolOverride,
  StrategySymbolOverride,
  StrategySymbolOverrideIdentity,
} from './strategy-symbol-override.types';

export const STRATEGY_SYMBOL_OVERRIDE_REPOSITORY = Symbol(
  'STRATEGY_SYMBOL_OVERRIDE_REPOSITORY',
);

export interface StrategySymbolOverrideRepository {
  find(
    identity: StrategySymbolOverrideIdentity,
  ): Promise<PersistedStrategySymbolOverride | null>;

  upsert(
    override: StrategySymbolOverride,
    expectedVersion?: number,
  ): Promise<PersistedStrategySymbolOverride>;

  delete(
    identity: StrategySymbolOverrideIdentity,
    expectedVersion: number,
  ): Promise<void>;
}
