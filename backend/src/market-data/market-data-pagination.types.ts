export interface MarketDataPaginationOptions {
  readonly maxPages?: number;
  readonly maxItems?: number;
}

export interface MarketDataPage<T> {
  readonly items: readonly T[];
  readonly nextPageToken: string | null;
}

export interface MarketDataPaginatedResult<T> {
  readonly items: T[];
  readonly pagesFetched: number;
  readonly complete: boolean;
  readonly nextPageToken: string | null;
}
