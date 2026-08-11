export type AlpacaRetryDecisionReason =
  | 'RETRY_ALLOWED'
  | 'MAX_RETRIES_REACHED'
  | 'UNSAFE_HTTP_METHOD'
  | 'NON_RETRYABLE_ERROR';

export interface AlpacaRetryDecision {
  readonly retry: boolean;
  readonly reason: AlpacaRetryDecisionReason;
  readonly retryNumber: number;
  readonly maxRetries: number;
}
