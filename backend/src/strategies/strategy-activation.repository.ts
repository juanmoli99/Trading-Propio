import type {
  StrategyActivationIdentity,
  StrategyActivationState,
} from './strategy-activation.types';

export const STRATEGY_ACTIVATION_REPOSITORY = Symbol(
  'STRATEGY_ACTIVATION_REPOSITORY',
);

export interface StrategyActivationRepository {
  getOrCreate(
    identity: StrategyActivationIdentity,
  ): Promise<StrategyActivationState>;

  updateEnabled(
    identity: StrategyActivationIdentity,
    enabled: boolean,
    expectedVersion: number,
  ): Promise<StrategyActivationState>;
}
