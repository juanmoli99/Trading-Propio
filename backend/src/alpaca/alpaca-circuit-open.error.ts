export class AlpacaCircuitOpenError extends Error {
  readonly retryAt: Date;

  constructor(retryAt: Date) {
    super('Alpaca circuit breaker is open');

    this.name = 'AlpacaCircuitOpenError';
    this.retryAt = retryAt;
  }
}
