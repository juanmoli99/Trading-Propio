import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type { CorporateActionRecord } from './corporate-actions.types';
import type {
  CorporateActionSplit,
  CorporateActionSplitQuery,
  CorporateActionSplitResult,
  CorporateActionSplitType,
} from './corporate-action-split.types';

@Injectable()
export class CorporateActionSplitService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getSplits(
    query: CorporateActionSplitQuery,
  ): Promise<CorporateActionSplitResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        types: ['forward_split', 'reverse_split'],
        start: query.start,
        end: query.end,
        sort: 'asc',
      });

    const splits = result.items
      .filter(
        (item): item is CorporateActionRecord & {
          type: CorporateActionSplitType;
        } =>
          item.type === 'forward_split' ||
          item.type === 'reverse_split',
      )
      .map((item) => this.normalizeSplit(item));

    return {
      symbol,
      splits,
    };
  }

  private normalizeSplit(
    action: CorporateActionRecord & {
      type: CorporateActionSplitType;
    },
  ): CorporateActionSplit {
    if (action.symbol === null) {
      throw new Error(
        `Corporate action split ${action.id} is missing symbol`,
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action split ${action.id} is missing process date`,
      );
    }

    const oldRate = this.requirePositiveNumber(
      action.raw.old_rate,
      'old_rate',
      action.id,
    );

    const newRate = this.requirePositiveNumber(
      action.raw.new_rate,
      'new_rate',
      action.id,
    );

    const shareFactor = newRate / oldRate;

    if (
      !Number.isFinite(shareFactor) ||
      shareFactor <= 0
    ) {
      throw new Error(
        `Invalid corporate action split factor for ${action.id}`,
      );
    }

    this.validateDirection(
      action.type,
      oldRate,
      newRate,
      action.id,
    );

    return {
      id: action.id,
      type: action.type,
      symbol: action.symbol,
      processDate: new Date(action.processDate),
      oldRate,
      newRate,
      shareFactor,
    };
  }

  private validateDirection(
    type: CorporateActionSplitType,
    oldRate: number,
    newRate: number,
    id: string,
  ): void {
    if (
      type === 'forward_split' &&
      newRate <= oldRate
    ) {
      throw new Error(
        `Invalid forward split ratio for ${id}`,
      );
    }

    if (
      type === 'reverse_split' &&
      newRate >= oldRate
    ) {
      throw new Error(
        `Invalid reverse split ratio for ${id}`,
      );
    }
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
        `Invalid corporate action split ${field} for ${id}`,
      );
    }

    return number;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        'Invalid corporate action split symbol',
      );
    }

    return normalized;
  }
}