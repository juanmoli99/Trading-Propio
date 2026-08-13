import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type { CorporateActionRecord } from './corporate-actions.types';
import {
  CORPORATE_ACTION_MERGER_TYPES,
  type CorporateActionMerger,
  type CorporateActionMergerQuery,
  type CorporateActionMergerResult,
  type CorporateActionMergerType,
} from './corporate-action-merger.types';

@Injectable()
export class CorporateActionMergerService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getMergers(
    query: CorporateActionMergerQuery,
  ): Promise<CorporateActionMergerResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        types: [...CORPORATE_ACTION_MERGER_TYPES],
        start: query.start,
        end: query.end,
        sort: 'asc',
      });

    const mergers = result.items
      .filter(
        (
          item,
        ): item is CorporateActionRecord & {
          type: CorporateActionMergerType;
        } => this.isMergerType(item.type),
      )
      .map((item) => this.normalizeMerger(item));

    return {
      symbol,
      mergers,
    };
  }

  private normalizeMerger(
    action: CorporateActionRecord & {
      type: CorporateActionMergerType;
    },
  ): CorporateActionMerger {
    if (action.symbol === null) {
      throw new Error(
        `Corporate action merger ${action.id} is missing symbol`,
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action merger ${action.id} is missing process date`,
      );
    }

    const symbol = this.normalizeSymbol(action.symbol);

    const processDate = new Date(
      action.processDate.getTime(),
    );

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Corporate action merger ${action.id} has invalid process date`,
      );
    }

    if (
      typeof action.raw !== 'object' ||
      action.raw === null ||
      Array.isArray(action.raw)
    ) {
      throw new Error(
        `Corporate action merger ${action.id} has invalid raw payload`,
      );
    }

    return {
      id: this.normalizeId(action.id),
      type: action.type,
      symbol,
      processDate,
      raw: structuredClone(action.raw),
    };
  }

  private isMergerType(
    type: string,
  ): type is CorporateActionMergerType {
    return (
      type === 'cash_merger' ||
      type === 'stock_merger' ||
      type === 'stock_and_cash_merger'
    );
  }

  private normalizeId(id: string): string {
    const normalized = id.trim();

    if (!normalized) {
      throw new Error(
        'Invalid corporate action merger ID',
      );
    }

    return normalized;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        'Invalid corporate action merger symbol',
      );
    }

    return normalized;
  }
}