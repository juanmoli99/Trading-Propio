import { Inject, Injectable } from '@nestjs/common';
import {
  STRATEGY_ACTIVATION_REPOSITORY,
  type StrategyActivationRepository,
} from './strategy-activation.repository';
import type {
  StrategyActivationIdentity,
  StrategyActivationState,
} from './strategy-activation.types';

@Injectable()
export class StrategyActivationService {
  constructor(
    @Inject(STRATEGY_ACTIVATION_REPOSITORY)
    private readonly repository: StrategyActivationRepository,
  ) {}

  async getState(
    identity: StrategyActivationIdentity,
  ): Promise<StrategyActivationState> {
    const state = await this.repository.getOrCreate(identity);

    return this.cloneState(state);
  }

  async setEnabled(
    identity: StrategyActivationIdentity,
    enabled: boolean,
  ): Promise<StrategyActivationState> {
    if (typeof enabled !== 'boolean') {
      throw new Error('Invalid strategy activation enabled state');
    }

    const current = await this.repository.getOrCreate(identity);

    if (current.enabled === enabled) {
      return this.cloneState(current);
    }

    const updated = await this.repository.updateEnabled(
      identity,
      enabled,
      current.version,
    );

    return this.cloneState(updated);
  }

  async activate(
    identity: StrategyActivationIdentity,
  ): Promise<StrategyActivationState> {
    return this.setEnabled(identity, true);
  }

  async deactivate(
    identity: StrategyActivationIdentity,
  ): Promise<StrategyActivationState> {
    return this.setEnabled(identity, false);
  }

  private cloneState(state: StrategyActivationState): StrategyActivationState {
    return {
      strategyId: state.strategyId,
      strategyVersion: state.strategyVersion,
      enabled: state.enabled,
      version: state.version,
      createdAt: new Date(state.createdAt.getTime()),
      updatedAt: new Date(state.updatedAt.getTime()),
    };
  }
}
