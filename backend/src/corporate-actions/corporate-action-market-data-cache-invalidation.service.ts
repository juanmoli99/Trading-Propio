import { Injectable } from '@nestjs/common';
import { MarketDataCacheService } from '../market-data/market-data-cache.service';
import { CorporateActionEffectiveService } from './corporate-action-effective.service';
import type { CorporateActionEffectiveRecord } from './corporate-action-effective.types';
import type {
  CorporateActionMarketDataCacheInvalidationItem,
  CorporateActionMarketDataCacheInvalidationQuery,
  CorporateActionMarketDataCacheInvalidationResult,
} from './corporate-action-market-data-cache-invalidation.types';

@Injectable()
export class CorporateActionMarketDataCacheInvalidationService {
  constructor(
    private readonly cache: MarketDataCacheService,
    private readonly effectiveService: CorporateActionEffectiveService,
  ) {}

  async invalidateAffectedCache(
    query: CorporateActionMarketDataCacheInvalidationQuery = {},
  ): Promise<CorporateActionMarketDataCacheInvalidationResult> {
    const effective = await this.effectiveService.getEffectiveActions({
      symbols: query.symbols,
      asOf: query.asOf,
      start: query.start,
    });

    const items = effective.effective.map((action) =>
      this.invalidateAction(action),
    );

    const affectedSymbols = new Set<string>();

    for (const item of items) {
      for (const symbol of item.affectedSymbols) {
        affectedSymbols.add(symbol);
      }
    }

    return {
      asOf: new Date(effective.asOf),
      items,
      affectedSymbolCount: affectedSymbols.size,
      invalidatedEntryCount: items.reduce(
        (total, item) => total + item.invalidatedEntryCount,
        0,
      ),
    };
  }

  private invalidateAction(
    action: CorporateActionEffectiveRecord,
  ): CorporateActionMarketDataCacheInvalidationItem {
    const id = this.normalizeId(action.id);

    const processDate = this.cloneProcessDate(action, id);

    const affectedSymbols = this.resolveAffectedSymbols(action, id);

    let invalidatedEntryCount = 0;

    for (const symbol of affectedSymbols) {
      invalidatedEntryCount += this.invalidateSymbol(symbol);
    }

    return {
      corporateActionId: id,
      corporateActionType: action.type,
      processDate,
      affectedSymbols,
      invalidatedEntryCount,
    };
  }

  private resolveAffectedSymbols(
    action: CorporateActionEffectiveRecord,
    id: string,
  ): string[] {
    const symbols = new Set<string>();

    if (action.symbol !== null) {
      symbols.add(this.normalizeSymbol(action.symbol, 'symbol', id));
    }

    if (action.type === 'name_change') {
      symbols.add(
        this.requireRawSymbol(action.raw.old_symbol, 'old_symbol', id),
      );

      symbols.add(
        this.requireRawSymbol(action.raw.new_symbol, 'new_symbol', id),
      );
    }

    return [...symbols];
  }

  private invalidateSymbol(symbol: string): number {
    const encodedSymbol = encodeURIComponent(symbol);

    const prefix = `/v2/stocks/${encodedSymbol}/`;

    return this.cache.deleteByPrefix(prefix);
  }

  private requireRawSymbol(value: unknown, field: string, id: string): string {
    if (typeof value !== 'string') {
      throw new Error(
        `Invalid corporate action market-data cache invalidation ${field} for ${id}`,
      );
    }

    return this.normalizeSymbol(value, field, id);
  }

  private normalizeSymbol(value: string, field: string, id: string): string {
    const symbol = value.trim().toUpperCase();

    if (!symbol || symbol.length > 32 || /\s/.test(symbol)) {
      throw new Error(
        `Invalid corporate action market-data cache invalidation ${field} for ${id}`,
      );
    }

    return symbol;
  }

  private normalizeId(id: string): string {
    const normalized = id.trim();

    if (!normalized) {
      throw new Error(
        'Invalid corporate action market-data cache invalidation ID',
      );
    }

    return normalized;
  }

  private cloneProcessDate(
    action: CorporateActionEffectiveRecord,
    id: string,
  ): Date {
    const processDate = new Date(action.processDate.getTime());

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Invalid corporate action market-data cache invalidation process date for ${id}`,
      );
    }

    return processDate;
  }
}
