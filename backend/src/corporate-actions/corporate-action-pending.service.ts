import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type {
  CorporateActionPendingQuery,
  CorporateActionPendingRecord,
  CorporateActionPendingResult,
  CorporateActionPendingSourceRecord,
} from './corporate-action-pending.types';

@Injectable()
export class CorporateActionPendingService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getPendingActions(
    query: CorporateActionPendingQuery = {},
  ): Promise<CorporateActionPendingResult> {
    const asOf = this.normalizeAsOf(query.asOf);
    const start = this.formatUtcDate(asOf);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: query.symbols,
        types: query.types,
        start,
        end: query.end,
        sort: 'asc',
      });

    const pending = result.items
      .map((item) => this.normalizeRecord(item))
      .filter(
        (item) =>
          item.processDate.getTime() > asOf.getTime(),
      );

    return {
      asOf: new Date(asOf),
      pending,
    };
  }

  private normalizeRecord(
    action: CorporateActionPendingSourceRecord,
  ): CorporateActionPendingRecord {
    const id = action.id.trim();

    if (!id) {
      throw new Error(
        'Corporate action pending detection received an invalid ID',
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action ${id} cannot be classified as pending without process date`,
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
        'Invalid corporate action pending reference timestamp',
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
        'Invalid corporate action pending symbol',
      );
    }

    return normalized;
  }
}