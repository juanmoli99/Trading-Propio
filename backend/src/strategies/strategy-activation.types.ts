export interface StrategyActivationIdentity {
  readonly strategyId: string;
  readonly strategyVersion: string;
}

export interface StrategyActivationState extends StrategyActivationIdentity {
  readonly enabled: boolean;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
