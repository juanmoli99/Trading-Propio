import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type { CorporateActionRecord } from './corporate-actions.types';
import type {
  CorporateActionStockDividend,
  CorporateActionStockDividendQuery,
  CorporateActionStockDividendResult,
} from './corporate-action-stock-dividend.types';

@Injectable()
export class CorporateActionStockDividendService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getStockDividends(
    query: CorporateActionStockDividendQuery,
  ): Promise<CorporateActionStockDividendResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        types: ['stock_dividend'],
        start: query.start,
        end: query.end,
        sort: 'asc',
      });

    const dividends = result.items
      .filter(
        (
          item,
        ): item is CorporateActionRecord & {
          type: 'stock_dividend';
        } => item.type === 'stock_dividend',
      )
      .map((item) => this.normalizeStockDividend(item));

    return {
      symbol,
      dividends,
    };
  }

  private normalizeStockDividend(
    action: CorporateActionRecord & {
      type: 'stock_dividend';
    },
  ): CorporateActionStockDividend {
    if (action.symbol === null) {
      throw new Error(
        `Corporate action stock dividend ${action.id} is missing symbol`,
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action stock dividend ${action.id} is missing process date`,
      );
    }

    const rate = this.requirePositiveNumber(
      action.raw.rate,
      'rate',
      action.id,
    );

    return {
      id: action.id,
      symbol: action.symbol,
      processDate: new Date(action.processDate),
      rate,
      exDate: this.optionalDate(
        action.raw.ex_date,
        'ex_date',
        action.id,
      ),
      recordDate: this.optionalDate(
        action.raw.record_date,
        'record_date',
        action.id,
      ),
      payableDate: this.optionalDate(
        action.raw.payable_date,
        'payable_date',
        action.id,
      ),
    };
  }

  private requirePositiveNumber(
    value: unknown,
    field: string,
    id: string,
  ): number {
    const number =
      typeof value === 'number'
        ? value
        : typeof value === 'string' &&
            value.trim().length > 0
          ? Number(value)
          : Number.NaN;

    if (
      !Number.isFinite(number) ||
      number <= 0
    ) {
      throw new Error(
        `Invalid corporate action stock dividend ${field} for ${id}`,
      );
    }

    return number;
  }

  private optionalDate(
    value: unknown,
    field: string,
    id: string,
  ): Date | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ) {
      throw new Error(
        `Invalid corporate action stock dividend ${field} for ${id}`,
      );
    }

    const date = new Date(
      `${value.trim()}T00:00:00.000Z`,
    );

    if (!Number.isFinite(date.getTime())) {
      throw new Error(
        `Invalid corporate action stock dividend ${field} for ${id}`,
      );
    }

    return date;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        'Invalid corporate action stock dividend symbol',
      );
    }

    return normalized;
  }
}