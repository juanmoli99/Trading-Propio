export class AlpacaRateLimitError extends Error {
  readonly statusCode = 429;

  readonly resetAt: Date | null;

  constructor(
    resetAt: Date | null,
    options?: {
      cause?: unknown;
    },
  ) {
    super('Alpaca rate limit exceeded', {
      cause: options?.cause,
    });

    this.name = 'AlpacaRateLimitError';
    this.resetAt = resetAt;
  }
}
