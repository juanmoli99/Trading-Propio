import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type { CorporateActionRecord } from './corporate-actions.types';
import type {
  CorporateActionRedemption,
  CorporateActionRedemptionQuery,
  CorporateActionRedemptionResult,
} from './corporate-action-redemption.types';

@Injectable()
export class CorporateActionRedemptionService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getRedemptions(
    query: CorporateActionRedemptionQuery,
  ): Promise<CorporateActionRedemptionResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        types: ['redemption'],
        start: query.start,
        end: query.end,
        sort: 'asc',
      });

    const redemptions = result.items
      .filter(
        (
          item,
        ): item is CorporateActionRecord & {
          type: 'redemption';
        } => item.type === 'redemption',
      )
      .map((item) => this.normalizeRedemption(item));

    return {
      symbol,
      redemptions,
    };
  }

  private normalizeRedemption(
    action: CorporateActionRecord & {
      type: 'redemption';
    },
  ): CorporateActionRedemption {
    if (action.symbol === null) {
      throw new Error(
        `Corporate action redemption ${action.id} is missing symbol`,
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action redemption ${action.id} is missing process date`,
      );
    }

    const symbol = this.normalizeSymbol(action.symbol);
    const processDate = new Date(action.processDate.getTime());

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Corporate action redemption ${action.id} has invalid process date`,
      );
    }

    if (
      typeof action.raw !== 'object' ||
      action.raw === null ||
      Array.isArray(action.raw)
    ) {
      throw new Error(
        `Corporate action redemption ${action.id} has invalid raw payload`,
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
        'Invalid corporate action redemption ID',
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
        'Invalid corporate action redemption symbol',
      );
    }

    return normalized;
  }
}
