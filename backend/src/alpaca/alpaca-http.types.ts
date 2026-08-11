export type AlpacaHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AlpacaRequestConsumer =
  'SCANNER' | 'MARKET_DATA' | 'EXECUTOR' | 'SYSTEM';

export interface AlpacaHttpRequest {
  method: AlpacaHttpMethod;
  path: string;
  consumer: AlpacaRequestConsumer;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface AlpacaHttpResponse<T> {
  status: number;
  data: T;
  headers: Readonly<Record<string, string>>;
}
