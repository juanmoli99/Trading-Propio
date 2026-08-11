export type AlpacaCircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface AlpacaCircuitBreakerSnapshot {
  readonly state: AlpacaCircuitBreakerState;
  readonly consecutiveFailures: number;
  readonly failureThreshold: number;
  readonly openedAt: Date | null;
  readonly retryAt: Date | null;
}
