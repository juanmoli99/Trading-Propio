export type AlpacaNetworkErrorCode =
  | 'TIMEOUT'
  | 'CONNECTION_REFUSED'
  | 'CONNECTION_RESET'
  | 'DNS_FAILURE'
  | 'NETWORK_UNREACHABLE'
  | 'NETWORK_ERROR';

export class AlpacaNetworkError extends Error {
  readonly code: AlpacaNetworkErrorCode;

  readonly retryable: boolean;

  constructor(
    code: AlpacaNetworkErrorCode,
    message: string,
    options?: {
      cause?: unknown;
      retryable?: boolean;
    },
  ) {
    super(message, {
      cause: options?.cause,
    });

    this.name = 'AlpacaNetworkError';
    this.code = code;
    this.retryable = options?.retryable ?? true;
  }
}
