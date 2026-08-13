import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type { CorporateActionRecord } from './corporate-actions.types';
import type {
  CorporateActionCashDividend,
  CorporateActionCashDividendQuery,
  CorporateActionCashDividendResult,
} from './corporate-action-cash-dividend.types';

@Injectable()
export class CorporateActionCashDividendService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getCashDividends(
    query: CorporateActionCashDividendQuery,
  ): Promise<CorporateActionCashDividendResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        types: ['cash_dividend'],
        start: query.start,
        end: query.end,
        sort: 'asc',
      });

    const dividends = result.items
      .filter(
        (
          item,
        ): item is CorporateActionRecord & {
          type: 'cash_dividend';
        } => item.type === 'cash_dividend',
      )
      .map((item) => this.normalizeCashDividend(item));

    return {
      symbol,
      dividends,
    };
  }

  private normalizeCashDividend(
    action: CorporateActionRecord & {
      type: 'cash_dividend';
    },
  ): CorporateActionCashDividend {
    if (action.symbol === null) {
      throw new Error(
        `Corporate action cash dividend ${action.id} is missing symbol`,
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action cash dividend ${action.id} is missing process date`,
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
      currency: this.optionalCurrency(
        action.raw.currency,
        action.id,
      ),
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
        `Invalid corporate action cash dividend ${field} for ${id}`,
      );
    }

    return number;
  }

  private optionalCurrency(
    value: unknown,
    id: string,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error(
        `Invalid corporate action cash dividend currency for ${id}`,
      );
    }

    const normalized = value.trim().toUpperCase();

    if (
      !normalized ||
      !/^[A-Z]{3}$/.test(normalized)
    ) {
      throw new Error(
        `Invalid corporate action cash dividend currency for ${id}`,
      );
    }

    return normalized;
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
        `Invalid corporate action cash dividend ${field} for ${id}`,
      );
    }

    const date = new Date(
      `${value.trim()}T00:00:00.000Z`,
    );

    if (!Number.isFinite(date.getTime())) {
      throw new Error(
        `Invalid corporate action cash dividend ${field} for ${id}`,
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
        'Invalid corporate action cash dividend symbol',
      );
    }

    return normalized;
  }
}