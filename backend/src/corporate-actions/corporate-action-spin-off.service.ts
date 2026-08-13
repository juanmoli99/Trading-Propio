import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type { CorporateActionRecord } from './corporate-actions.types';
import type {
  CorporateActionSpinOff,
  CorporateActionSpinOffQuery,
  CorporateActionSpinOffResult,
} from './corporate-action-spin-off.types';

@Injectable()
export class CorporateActionSpinOffService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getSpinOffs(
    query: CorporateActionSpinOffQuery,
  ): Promise<CorporateActionSpinOffResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        types: ['spin_off'],
        start: query.start,
        end: query.end,
        sort: 'asc',
      });

    const spinOffs = result.items
      .filter(
        (
          item,
        ): item is CorporateActionRecord & {
          type: 'spin_off';
        } => item.type === 'spin_off',
      )
      .map((item) => this.normalizeSpinOff(item));

    return {
      symbol,
      spinOffs,
    };
  }

  private normalizeSpinOff(
    action: CorporateActionRecord & {
      type: 'spin_off';
    },
  ): CorporateActionSpinOff {
    if (action.symbol === null) {
      throw new Error(
        `Corporate action spin-off ${action.id} is missing symbol`,
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action spin-off ${action.id} is missing process date`,
      );
    }

    const symbol = this.normalizeSymbol(action.symbol);
    const processDate = new Date(action.processDate.getTime());

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Corporate action spin-off ${action.id} has invalid process date`,
      );
    }

    if (
      typeof action.raw !== 'object' ||
      action.raw === null ||
      Array.isArray(action.raw)
    ) {
      throw new Error(
        `Corporate action spin-off ${action.id} has invalid raw payload`,
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
        'Invalid corporate action spin-off ID',
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
        'Invalid corporate action spin-off symbol',
      );
    }

    return normalized;
  }
}
