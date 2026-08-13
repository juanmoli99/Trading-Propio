import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CorporateActionEffectiveService } from './corporate-action-effective.service';
import type { CorporateActionEffectiveRecord } from './corporate-action-effective.types';
import type {
  CorporateActionSymbolUpdateItem,
  CorporateActionSymbolUpdateQuery,
  CorporateActionSymbolUpdateResult,
} from './corporate-action-symbol-update.types';

@Injectable()
export class CorporateActionSymbolUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly effectiveService: CorporateActionEffectiveService,
  ) {}

  async updateLocalSymbols(
    query: CorporateActionSymbolUpdateQuery = {},
  ): Promise<CorporateActionSymbolUpdateResult> {
    const effective =
      await this.effectiveService.getEffectiveActions({
        symbols: query.symbols,
        types: ['name_change'],
        asOf: query.asOf,
        start: query.start,
      });

    const items = await this.prisma.$transaction(
      async (transaction) => {
        const results: CorporateActionSymbolUpdateItem[] = [];

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
      updatedEventCount: items.filter(
        (item) => item.status === 'UPDATED',
      ).length,
      noLocalReferencesCount: items.filter(
        (item) => item.status === 'NO_LOCAL_REFERENCES',
      ).length,
      nameOnlyCount: items.filter(
        (item) => item.status === 'NAME_ONLY',
      ).length,
      updatedPlatformOrderCount: items.reduce(
        (total, item) =>
          total + item.updatedPlatformOrderCount,
        0,
      ),
    };
  }

  private async applyNameChange(
    action: CorporateActionEffectiveRecord,
    transaction: Parameters<
      Parameters<PrismaService['$transaction']>[0]
    >[0],
  ): Promise<CorporateActionSymbolUpdateItem> {
    if (action.type !== 'name_change') {
      throw new Error(
        `Unexpected corporate action type for symbol update: ${action.type}`,
      );
    }

    const oldSymbol = this.requireSymbol(
      action.raw.old_symbol,
      'old_symbol',
      action.id,
    );

    const newSymbol = this.requireSymbol(
      action.raw.new_symbol,
      'new_symbol',
      action.id,
    );

    if (oldSymbol === newSymbol) {
      return {
        corporateActionId: this.normalizeId(action.id),
        processDate: this.cloneProcessDate(action),
        oldSymbol,
        newSymbol,
        status: 'NAME_ONLY',
        updatedPlatformOrderCount: 0,
      };
    }

    const update =
      await transaction.platformAlpacaOrder.updateMany({
        where: {
          symbol: oldSymbol,
        },
        data: {
          symbol: newSymbol,
        },
      });

    return {
      corporateActionId: this.normalizeId(action.id),
      processDate: this.cloneProcessDate(action),
      oldSymbol,
      newSymbol,
      status:
        update.count > 0
          ? 'UPDATED'
          : 'NO_LOCAL_REFERENCES',
      updatedPlatformOrderCount: update.count,
    };
  }

  private cloneProcessDate(
    action: CorporateActionEffectiveRecord,
  ): Date {
    const processDate = new Date(
      action.processDate.getTime(),
    );

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Invalid corporate action process date for ${action.id}`,
      );
    }

    return processDate;
  }

  private normalizeId(id: string): string {
    const normalized = id.trim();

    if (!normalized) {
      throw new Error(
        'Invalid corporate action symbol update ID',
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
        `Invalid corporate action symbol update ${field} for ${id}`,
      );
    }

    const normalized = value.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        `Invalid corporate action symbol update ${field} for ${id}`,
      );
    }

    return normalized;
  }
}