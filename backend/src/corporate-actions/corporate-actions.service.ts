import { Injectable } from '@nestjs/common';
import { MarketDataClientService } from '../market-data/market-data-client.service';
import { MarketDataPaginationService } from '../market-data/market-data-pagination.service';
import type { MarketDataPaginationOptions } from '../market-data/market-data-pagination.types';
import {
  normalizeCorporateActionsResponse,
  type CorporateActionsApiResponse,
} from './corporate-actions.mapper';
import {
  CORPORATE_ACTION_TYPES,
  type CorporateActionPage,
  type CorporateActionPaginatedResult,
  type CorporateActionQuery,
  type CorporateActionType,
} from './corporate-actions.types';

@Injectable()
export class CorporateActionsService {
  constructor(
    private readonly client: MarketDataClientService,
    private readonly pagination: MarketDataPaginationService,
  ) {}

  async getCorporateActions(
    query: CorporateActionQuery = {},
  ): Promise<CorporateActionPage> {
    const normalized = this.normalizeQuery(query);

    const response =
      await this.client.request<CorporateActionsApiResponse>({
        path: '/v1/corporate-actions',
        query: {
          symbols: normalized.symbols,
          types: normalized.types,
          start: normalized.start,
          end: normalized.end,
          ids: normalized.ids,
          limit: normalized.limit,
          page_token: normalized.pageToken,
          sort: normalized.sort,
        },
      });

    return normalizeCorporateActionsResponse(response.data);
  }

  async getAllCorporateActions(
    query: CorporateActionQuery = {},
    paginationOptions?: MarketDataPaginationOptions,
  ): Promise<CorporateActionPaginatedResult> {
    const normalized = this.normalizeQuery(query);

    const result = await this.pagination.collect(
      async (pageToken) => {
        const page = await this.getCorporateActions({
          ...query,
          pageToken,
        });

        return {
          items: page.actions,
          nextPageToken: page.nextPageToken,
        };
      },
      paginationOptions,
    );

    return result;
  }

  private normalizeQuery(
    query: CorporateActionQuery,
  ): {
    symbols?: string;
    types?: string;
    start?: string;
    end?: string;
    ids?: string;
    limit?: number;
    pageToken?: string;
    sort?: 'asc' | 'desc';
  } {
    if (
      query.limit !== undefined &&
      (!Number.isInteger(query.limit) ||
        query.limit < 1 ||
        query.limit > 1000)
    ) {
      throw new Error(
        'Corporate actions limit must be between 1 and 1000',
      );
    }

    const symbols = this.normalizeSymbols(query.symbols);
    const types = this.normalizeTypes(query.types);
    const ids = this.normalizeIds(query.ids);

    if (
      ids !== undefined &&
      (
        symbols !== undefined ||
        types !== undefined ||
        query.start !== undefined ||
        query.end !== undefined
      )
    ) {
      throw new Error(
        'Corporate action IDs cannot be combined with other filters',
      );
    }

    const start = this.normalizeDate(query.start, 'start');
    const end = this.normalizeDate(query.end, 'end');

    if (
      start !== undefined &&
      end !== undefined &&
      start > end
    ) {
      throw new Error(
        'Corporate actions start must not be after end',
      );
    }

    const pageToken =
      query.pageToken === undefined
        ? undefined
        : query.pageToken.trim();

    if (
      query.pageToken !== undefined &&
      !pageToken
    ) {
      throw new Error(
        'Corporate actions page token cannot be empty',
      );
    }

    if (
      query.sort !== undefined &&
      query.sort !== 'asc' &&
      query.sort !== 'desc'
    ) {
      throw new Error(
        'Invalid corporate actions sort',
      );
    }

    return {
      symbols,
      types,
      start,
      end,
      ids,
      limit: query.limit,
      pageToken,
      sort: query.sort,
    };
  }

  private normalizeSymbols(
    symbols: readonly string[] | undefined,
  ): string | undefined {
    if (symbols === undefined) {
      return undefined;
    }

    if (symbols.length === 0) {
      throw new Error(
        'Corporate actions symbols cannot be empty',
      );
    }

    const normalized = symbols.map((symbol) => {
      const value = symbol.trim().toUpperCase();

      if (
        !value ||
        value.length > 32 ||
        /\s/.test(value)
      ) {
        throw new Error(
          'Invalid corporate actions symbol',
        );
      }

      return value;
    });

    if (new Set(normalized).size !== normalized.length) {
      throw new Error(
        'Duplicate corporate actions symbol',
      );
    }

    return normalized.join(',');
  }

  private normalizeTypes(
    types: readonly CorporateActionType[] | undefined,
  ): string | undefined {
    if (types === undefined) {
      return undefined;
    }

    if (types.length === 0) {
      throw new Error(
        'Corporate actions types cannot be empty',
      );
    }

    for (const type of types) {
      if (!CORPORATE_ACTION_TYPES.includes(type)) {
        throw new Error(
          `Invalid corporate action type: ${String(type)}`,
        );
      }
    }

    if (new Set(types).size !== types.length) {
      throw new Error(
        'Duplicate corporate action type',
      );
    }

    return types.join(',');
  }

  private normalizeIds(
    ids: readonly string[] | undefined,
  ): string | undefined {
    if (ids === undefined) {
      return undefined;
    }

    if (ids.length === 0) {
      throw new Error(
        'Corporate action IDs cannot be empty',
      );
    }

    const normalized = ids.map((id) => {
      const value = id.trim();

      if (!value) {
        throw new Error(
          'Invalid corporate action ID',
        );
      }

      return value;
    });

    if (new Set(normalized).size !== normalized.length) {
      throw new Error(
        'Duplicate corporate action ID',
      );
    }

    return normalized.join(',');
  }

  private normalizeDate(
    value: string | undefined,
    field: string,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value.trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ) {
      throw new Error(
        `Invalid corporate actions ${field} date`,
      );
    }

    const parsed = new Date(
      `${normalized}T00:00:00.000Z`,
    );

    if (!Number.isFinite(parsed.getTime())) {
      throw new Error(
        `Invalid corporate actions ${field} date`,
      );
    }

    return normalized;
  }
}