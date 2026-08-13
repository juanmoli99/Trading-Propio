import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { CorporateActionEffectiveService } from './corporate-action-effective.service';
import type { CorporateActionEffectiveRecord } from './corporate-action-effective.types';
import type {
  CorporateActionWatchlistUpdateItem,
  CorporateActionWatchlistUpdateQuery,
  CorporateActionWatchlistUpdateResult,
} from './corporate-action-watchlist-update.types';

@Injectable()
export class CorporateActionWatchlistUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly effectiveService: CorporateActionEffectiveService,
  ) {}

  async updateWatchlist(
    query: CorporateActionWatchlistUpdateQuery = {},
  ): Promise<CorporateActionWatchlistUpdateResult> {
    const effective =
      await this.effectiveService.getEffectiveActions({
        symbols: query.symbols,
        types: ['name_change'],
        asOf: query.asOf,
        start: query.start,
      });

    const items = await this.prisma.$transaction(
      async (transaction) => {
        const results: CorporateActionWatchlistUpdateItem[] = [];

        for (const action of effective.effective) {
          results.push(
            await this.applyNameChange(
              action,
              transaction,
            ),
          );
        }

        return results;
      },
    );

    return {
      asOf: new Date(effective.asOf),
      items,
      updatedCount: this.countStatus(
        items,
        'UPDATED',
      ),
      removedObsoleteDuplicateCount: this.countStatus(
        items,
        'REMOVED_OBSOLETE_DUPLICATE',
      ),
      notInWatchlistCount: this.countStatus(
        items,
        'NOT_IN_WATCHLIST',
      ),
      nameOnlyCount: this.countStatus(
        items,
        'NAME_ONLY',
      ),
    };
  }

  private async applyNameChange(
    action: CorporateActionEffectiveRecord,
    transaction: Prisma.TransactionClient,
  ): Promise<CorporateActionWatchlistUpdateItem> {
    if (action.type !== 'name_change') {
      throw new Error(
        `Unexpected corporate action type for watchlist update: ${action.type}`,
      );
    }

    const id = this.normalizeId(action.id);

    const oldSymbol = this.requireSymbol(
      action.raw.old_symbol,
      'old_symbol',
      id,
    );

    const newSymbol = this.requireSymbol(
      action.raw.new_symbol,
      'new_symbol',
      id,
    );

    const processDate = this.cloneProcessDate(
      action,
      id,
    );

    if (oldSymbol === newSymbol) {
      return {
        corporateActionId: id,
        processDate,
        oldSymbol,
        newSymbol,
        status: 'NAME_ONLY',
      };
    }

    const [oldEntry, newEntry] = await Promise.all([
      transaction.watchlistSymbol.findUnique({
        where: {
          symbol: oldSymbol,
        },
        select: {
          id: true,
        },
      }),
      transaction.watchlistSymbol.findUnique({
        where: {
          symbol: newSymbol,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (oldEntry === null) {
      return {
        corporateActionId: id,
        processDate,
        oldSymbol,
        newSymbol,
        status: 'NOT_IN_WATCHLIST',
      };
    }

    if (newEntry !== null) {
      await transaction.watchlistSymbol.delete({
        where: {
          id: oldEntry.id,
        },
      });

      return {
        corporateActionId: id,
        processDate,
        oldSymbol,
        newSymbol,
        status: 'REMOVED_OBSOLETE_DUPLICATE',
      };
    }

    await transaction.watchlistSymbol.update({
      where: {
        id: oldEntry.id,
      },
      data: {
        symbol: newSymbol,
      },
    });

    return {
      corporateActionId: id,
      processDate,
      oldSymbol,
      newSymbol,
      status: 'UPDATED',
    };
  }

  private countStatus(
    items: readonly CorporateActionWatchlistUpdateItem[],
    status: CorporateActionWatchlistUpdateItem['status'],
  ): number {
    return items.filter(
      (item) => item.status === status,
    ).length;
  }

  private cloneProcessDate(
    action: CorporateActionEffectiveRecord,
    id: string,
  ): Date {
    const processDate = new Date(
      action.processDate.getTime(),
    );

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Invalid corporate action watchlist update process date for ${id}`,
      );
    }

    return processDate;
  }

  private normalizeId(id: string): string {
    const normalized = id.trim();

    if (!normalized) {
      throw new Error(
        'Invalid corporate action watchlist update ID',
      );
    }

    return normalized;
  }

  private requireSymbol(
    value: unknown,
    field: string,
    id: string,
  ): string {
    if (typeof value !== 'string') {
      throw new Error(
        `Invalid corporate action watchlist update ${field} for ${id}`,
      );
    }

    const normalized = value.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        `Invalid corporate action watchlist update ${field} for ${id}`,
      );
    }

    return normalized;
  }
}