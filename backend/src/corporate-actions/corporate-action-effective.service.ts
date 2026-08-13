import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type {
  CorporateActionEffectiveQuery,
  CorporateActionEffectiveRecord,
  CorporateActionEffectiveResult,
  CorporateActionEffectiveSourceRecord,
} from './corporate-action-effective.types';

@Injectable()
export class CorporateActionEffectiveService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getEffectiveActions(
    query: CorporateActionEffectiveQuery = {},
  ): Promise<CorporateActionEffectiveResult> {
    const asOf = this.normalizeAsOf(query.asOf);
    const end = this.formatUtcDate(asOf);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: query.symbols,
        types: query.types,
        start: query.start,
        end,
        sort: 'asc',
      });

    const effective = result.items
      .map((item) => this.normalizeRecord(item))
      .filter(
        (item) =>
          item.processDate.getTime() <= asOf.getTime(),
      );

    return {
      asOf: new Date(asOf),
      effective,
    };
  }

  private normalizeRecord(
    action: CorporateActionEffectiveSourceRecord,
  ): CorporateActionEffectiveRecord {
    const id = action.id.trim();

    if (!id) {
      throw new Error(
        'Corporate action effective detection received an invalid ID',
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action ${id} cannot be classified as effective without process date`,
      );
    }

    const processDate = new Date(
      action.processDate.getTime(),
    );

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Corporate action ${id} has invalid process date`,
      );
    }

    const symbol =
      action.symbol === null
        ? null
        : this.normalizeSymbol(action.symbol);

    if (
      typeof action.raw !== 'object' ||
      action.raw === null ||
      Array.isArray(action.raw)
    ) {
      throw new Error(
        `Corporate action ${id} has invalid raw payload`,
      );
    }

    return {
      id,
      type: action.type,
      symbol,
      processDate,
      raw: structuredClone(action.raw),
    };
  }

  private normalizeAsOf(value: Date | undefined): Date {
    const source = value ?? new Date();
    const milliseconds = source.getTime();

    if (!Number.isFinite(milliseconds)) {
      throw new Error(
        'Invalid corporate action effective reference timestamp',
      );
    }

    return new Date(
      Date.UTC(
        source.getUTCFullYear(),
        source.getUTCMonth(),
        source.getUTCDate(),
      ),
    );
  }

  private formatUtcDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        'Invalid corporate action effective symbol',
      );
    }

    return normalized;
  }
}