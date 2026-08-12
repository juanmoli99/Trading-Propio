import { Injectable } from '@nestjs/common';
import type {
  MarketDataPage,
  MarketDataPaginatedResult,
  MarketDataPaginationOptions,
} from './market-data-pagination.types';

const DEFAULT_MAX_PAGES = 100;
const DEFAULT_MAX_ITEMS = 100_000;
const ABSOLUTE_MAX_PAGES = 1_000;
const ABSOLUTE_MAX_ITEMS = 1_000_000;

@Injectable()
export class MarketDataPaginationService {
  async collect<T>(
    fetchPage: (pageToken: string | undefined) => Promise<MarketDataPage<T>>,
    options: MarketDataPaginationOptions = {},
  ): Promise<MarketDataPaginatedResult<T>> {
    const maxPages = this.resolveMaxPages(options.maxPages);

    const maxItems = this.resolveMaxItems(options.maxItems);

    const items: T[] = [];
    const seenTokens = new Set<string>();

    let pageToken: string | undefined;
    let pagesFetched = 0;

    while (pagesFetched < maxPages) {
      const page = await fetchPage(pageToken);

      pagesFetched += 1;

      const remainingCapacity = maxItems - items.length;

      if (remainingCapacity <= 0) {
        return {
          items,
          pagesFetched,
          complete: false,
          nextPageToken: pageToken ?? null,
        };
      }

      const pageItems = page.items.slice(0, remainingCapacity);

      items.push(...pageItems);

      if (pageItems.length < page.items.length) {
        return {
          items,
          pagesFetched,
          complete: false,
          nextPageToken: pageToken ?? null,
        };
      }

      const nextPageToken = page.nextPageToken;

      if (nextPageToken === null) {
        return {
          items,
          pagesFetched,
          complete: true,
          nextPageToken: null,
        };
      }

      if (seenTokens.has(nextPageToken)) {
        throw new Error(
          'Market data pagination returned a repeated page token',
        );
      }

      seenTokens.add(nextPageToken);
      pageToken = nextPageToken;
    }

    return {
      items,
      pagesFetched,
      complete: false,
      nextPageToken: pageToken ?? null,
    };
  }

  private resolveMaxPages(value: number | undefined): number {
    const resolved = value ?? DEFAULT_MAX_PAGES;

    if (
      !Number.isInteger(resolved) ||
      resolved < 1 ||
      resolved > ABSOLUTE_MAX_PAGES
    ) {
      throw new Error(
        `Market data pagination maxPages must be between 1 and ${ABSOLUTE_MAX_PAGES}`,
      );
    }

    return resolved;
  }

  private resolveMaxItems(value: number | undefined): number {
    const resolved = value ?? DEFAULT_MAX_ITEMS;

    if (
      !Number.isInteger(resolved) ||
      resolved < 1 ||
      resolved > ABSOLUTE_MAX_ITEMS
    ) {
      throw new Error(
        `Market data pagination maxItems must be between 1 and ${ABSOLUTE_MAX_ITEMS}`,
      );
    }

    return resolved;
  }
}
