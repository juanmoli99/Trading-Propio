import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type { CorporateActionRecord } from './corporate-actions.types';
import type {
  CorporateActionWorthlessRemoval,
  CorporateActionWorthlessRemovalQuery,
  CorporateActionWorthlessRemovalResult,
} from './corporate-action-worthless-removal.types';

@Injectable()
export class CorporateActionWorthlessRemovalService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getWorthlessRemovals(
    query: CorporateActionWorthlessRemovalQuery,
  ): Promise<CorporateActionWorthlessRemovalResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        types: ['worthless_removal'],
        start: query.start,
        end: query.end,
        sort: 'asc',
      });

    const removals = result.items
      .filter(
        (
          item,
        ): item is CorporateActionRecord & {
          type: 'worthless_removal';
        } => item.type === 'worthless_removal',
      )
      .map((item) => this.normalizeWorthlessRemoval(item));

    return {
      symbol,
      removals,
    };
  }

  private normalizeWorthlessRemoval(
    action: CorporateActionRecord & {
      type: 'worthless_removal';
    },
  ): CorporateActionWorthlessRemoval {
    if (action.symbol === null) {
      throw new Error(
        `Corporate action worthless removal ${action.id} is missing symbol`,
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action worthless removal ${action.id} is missing process date`,
      );
    }

    const symbol = this.normalizeSymbol(action.symbol);
    const processDate = new Date(action.processDate.getTime());

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Corporate action worthless removal ${action.id} has invalid process date`,
      );
    }

    if (
      typeof action.raw !== 'object' ||
      action.raw === null ||
      Array.isArray(action.raw)
    ) {
      throw new Error(
        `Corporate action worthless removal ${action.id} has invalid raw payload`,
      );
    }

    return {
      id: this.normalizeId(action.id),
      symbol,
      processDate,
      raw: structuredClone(action.raw),
    };
  }

  private normalizeId(id: string): string {
    const normalized = id.trim();

    if (!normalized) {
      throw new Error(
        'Invalid corporate action worthless removal ID',
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
        'Invalid corporate action worthless removal symbol',
      );
    }

    return normalized;
  }
}
