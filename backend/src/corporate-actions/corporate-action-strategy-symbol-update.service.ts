import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { CorporateActionEffectiveService } from './corporate-action-effective.service';
import type { CorporateActionEffectiveRecord } from './corporate-action-effective.types';
import type {
  CorporateActionStrategySymbolUpdateItem,
  CorporateActionStrategySymbolUpdateQuery,
  CorporateActionStrategySymbolUpdateResult,
} from './corporate-action-strategy-symbol-update.types';

@Injectable()
export class CorporateActionStrategySymbolUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly effectiveService: CorporateActionEffectiveService,
  ) {}

  async updateStrategySymbols(
    query: CorporateActionStrategySymbolUpdateQuery = {},
  ): Promise<CorporateActionStrategySymbolUpdateResult> {
    const effective =
      await this.effectiveService.getEffectiveActions({
        symbols: query.symbols,
        types: ['name_change'],
        asOf: query.asOf,
        start: query.start,
      });

    const items = await this.prisma.$transaction(
      async (transaction) => {
        const results: CorporateActionStrategySymbolUpdateItem[] = [];

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

      updatedEventCount: this.countStatus(
        items,
        'UPDATED',
      ),

      removedObsoleteDuplicateEventCount:
        this.countStatus(
          items,
          'REMOVED_OBSOLETE_DUPLICATE',
        ),

      notAssociatedCount: this.countStatus(
        items,
        'NOT_ASSOCIATED',
      ),

      nameOnlyCount: this.countStatus(
        items,
        'NAME_ONLY',
      ),

      updatedAssociationCount: items.reduce(
        (total, item) =>
          total + item.updatedAssociationCount,
        0,
      ),

      removedDuplicateCount: items.reduce(
        (total, item) =>
          total + item.removedDuplicateCount,
        0,
      ),
    };
  }

  private async applyNameChange(
    action: CorporateActionEffectiveRecord,
    transaction: Prisma.TransactionClient,
  ): Promise<CorporateActionStrategySymbolUpdateItem> {
    if (action.type !== 'name_change') {
      throw new Error(
        `Unexpected corporate action type for strategy symbol update: ${action.type}`,
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

    const processDate =
      this.cloneProcessDate(action, id);

    if (oldSymbol === newSymbol) {
      return {
        corporateActionId: id,
        processDate,
        oldSymbol,
        newSymbol,
        status: 'NAME_ONLY',
        updatedAssociationCount: 0,
        removedDuplicateCount: 0,
      };
    }

    const oldAssociations =
      await transaction.strategySymbolAssociation.findMany({
        where: {
          symbol: oldSymbol,
        },
        select: {
          id: true,
          strategyId: true,
        },
      });

    if (oldAssociations.length === 0) {
      return {
        corporateActionId: id,
        processDate,
        oldSymbol,
        newSymbol,
        status: 'NOT_ASSOCIATED',
        updatedAssociationCount: 0,
        removedDuplicateCount: 0,
      };
    }

    let updatedAssociationCount = 0;
    let removedDuplicateCount = 0;

    for (const association of oldAssociations) {
      const existingNew =
        await transaction.strategySymbolAssociation.findUnique({
          where: {
            strategyId_symbol: {
              strategyId: association.strategyId,
              symbol: newSymbol,
            },
          },
          select: {
            id: true,
          },
        });

      if (existingNew !== null) {
        await transaction.strategySymbolAssociation.delete({
          where: {
            id: association.id,
          },
        });

        removedDuplicateCount += 1;
        continue;
      }

      await transaction.strategySymbolAssociation.update({
        where: {
          id: association.id,
        },
        data: {
          symbol: newSymbol,
        },
      });

      updatedAssociationCount += 1;
    }

    return {
      corporateActionId: id,
      processDate,
      oldSymbol,
      newSymbol,
      status:
        updatedAssociationCount > 0
          ? 'UPDATED'
          : 'REMOVED_OBSOLETE_DUPLICATE',
      updatedAssociationCount,
      removedDuplicateCount,
    };
  }

  private countStatus(
    items: readonly CorporateActionStrategySymbolUpdateItem[],
    status: CorporateActionStrategySymbolUpdateItem['status'],
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
        `Invalid corporate action strategy symbol update process date for ${id}`,
      );
    }

    return processDate;
  }

  private normalizeId(id: string): string {
    const normalized = id.trim();

    if (!normalized) {
      throw new Error(
        'Invalid corporate action strategy symbol update ID',
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
        `Invalid corporate action strategy symbol update ${field} for ${id}`,
      );
    }

    const normalized =
      value.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        `Invalid corporate action strategy symbol update ${field} for ${id}`,
      );
    }

    return normalized;
  }
}