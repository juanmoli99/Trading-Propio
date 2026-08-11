export type AlpacaRetryClassification =
  | 'NETWORK_RETRYABLE'
  | 'NETWORK_NON_RETRYABLE'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'HTTP_NON_RETRYABLE'
  | 'UNKNOWN_NON_RETRYABLE';

export interface AlpacaRetryClassificationResult {
  readonly retryable: boolean;
  readonly classification: AlpacaRetryClassification;
  readonly statusCode: number | null;
}
