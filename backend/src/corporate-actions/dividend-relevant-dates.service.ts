import { Injectable } from '@nestjs/common';
import { CorporateActionCashDividendService } from './corporate-action-cash-dividend.service';
import type { CorporateActionCashDividend } from './corporate-action-cash-dividend.types';
import type {
  DividendRelevantDate,
  DividendRelevantDatesQuery,
  DividendRelevantDatesResult,
  DividendRelevantDateType,
} from './dividend-relevant-dates.types';

@Injectable()
export class DividendRelevantDatesService {
  constructor(
    private readonly cashDividendService: CorporateActionCashDividendService,
  ) {}

  async getRelevantDates(
    query: DividendRelevantDatesQuery,
  ): Promise<DividendRelevantDatesResult> {
    const result = await this.cashDividendService.getCashDividends(query);

    const dates = result.dividends
      .flatMap((dividend) => this.extractRelevantDates(dividend))
      .sort((left, right) => {
        const difference = left.date.getTime() - right.date.getTime();

        if (difference !== 0) {
          return difference;
        }

        const idComparison = left.corporateActionId.localeCompare(
          right.corporateActionId,
        );

        if (idComparison !== 0) {
          return idComparison;
        }

        return left.type.localeCompare(right.type);
      });

    return {
      symbol: result.symbol,
      dates,
    };
  }

  private extractRelevantDates(
    dividend: CorporateActionCashDividend,
  ): DividendRelevantDate[] {
    const dates: DividendRelevantDate[] = [];

    this.appendDate(dates, dividend, 'EX_DATE', dividend.exDate);

    this.appendDate(dates, dividend, 'RECORD_DATE', dividend.recordDate);

    this.appendDate(dates, dividend, 'PAYABLE_DATE', dividend.payableDate);

    return dates;
  }

  private appendDate(
    target: DividendRelevantDate[],
    dividend: CorporateActionCashDividend,
    type: DividendRelevantDateType,
    value: Date | null,
  ): void {
    if (value === null) {
      return;
    }

    const date = new Date(value.getTime());

    if (!Number.isFinite(date.getTime())) {
      throw new Error(`Invalid relevant dividend ${type} for ${dividend.id}`);
    }

    target.push({
      corporateActionId: dividend.id,
      symbol: dividend.symbol,
      type,
      date,
      rate: dividend.rate,
      currency: dividend.currency,
    });
  }
}
