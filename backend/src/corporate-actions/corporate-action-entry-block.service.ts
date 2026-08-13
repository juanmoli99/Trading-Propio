import { Injectable } from '@nestjs/common';
import { CorporateActionPendingService } from './corporate-action-pending.service';
import type { CorporateActionPendingRecord } from './corporate-action-pending.types';
import type {
  CorporateActionEntryBlockItem,
  CorporateActionEntryBlockQuery,
  CorporateActionEntryBlockResult,
} from './corporate-action-entry-block.types';
import type { CorporateActionType } from './corporate-actions.types';

const AMBIGUOUS_ENTRY_BLOCK_TYPES = new Set<CorporateActionType>([
  'reverse_split',
  'forward_split',
  'unit_split',
  'stock_dividend',
  'spin_off',
  'cash_merger',
  'stock_merger',
  'stock_and_cash_merger',
  'redemption',
  'name_change',
  'worthless_removal',
  'rights_distribution',
  'reorganization',
  'partial_call',
]);

@Injectable()
export class CorporateActionEntryBlockService {
  constructor(private readonly pendingService: CorporateActionPendingService) {}

  async evaluate(
    query: CorporateActionEntryBlockQuery,
  ): Promise<CorporateActionEntryBlockResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const pending = await this.pendingService.getPendingActions({
      symbols: [symbol],
      asOf: query.asOf,
      end: query.end,
    });

    const ambiguousActions = pending.pending
      .filter((action) => this.isAmbiguousForEntry(action, symbol))
      .map((action) => this.toBlockItem(action));

    const entryBlocked = ambiguousActions.length > 0;

    return {
      symbol,
      asOf: new Date(pending.asOf),
      status: entryBlocked ? 'BLOCKED_AMBIGUOUS_CORPORATE_ACTION' : 'ALLOWED',
      entryBlocked,
      ambiguousActions,
    };
  }

  async assertEntryAllowed(
    query: CorporateActionEntryBlockQuery,
  ): Promise<void> {
    const result = await this.evaluate(query);

    if (!result.entryBlocked) {
      return;
    }

    const reasons = result.ambiguousActions
      .map(
        (action) =>
          `${action.corporateActionType}:${action.corporateActionId}` +
          `@${action.processDate.toISOString().slice(0, 10)}`,
      )
      .join(', ');

    throw new Error(
      `New entries for ${result.symbol} are temporarily blocked ` +
        `because pending corporate actions create an ambiguous state: ${reasons}`,
    );
  }

  private isAmbiguousForEntry(
    action: CorporateActionPendingRecord,
    requestedSymbol: string,
  ): boolean {
    if (!AMBIGUOUS_ENTRY_BLOCK_TYPES.has(action.type)) {
      return false;
    }

    if (action.symbol === null) {
      return true;
    }

    return this.normalizeSymbol(action.symbol) === requestedSymbol;
  }

  private toBlockItem(
    action: CorporateActionPendingRecord,
  ): CorporateActionEntryBlockItem {
    const id = action.id.trim();

    if (!id) {
      throw new Error('Corporate action entry block received an invalid ID');
    }

    const processDate = new Date(action.processDate.getTime());

    if (!Number.isFinite(processDate.getTime())) {
      throw new Error(
        `Corporate action entry block received an invalid process date for ${id}`,
      );
    }

    const symbol =
      action.symbol === null ? null : this.normalizeSymbol(action.symbol);

    return {
      corporateActionId: id,
      corporateActionType: action.type,
      symbol,
      processDate,
      reason:
        symbol === null
          ? 'Corporate action has no reliable symbol association'
          : `Pending ${action.type} may change instrument state`,
    };
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid corporate action entry block symbol');
    }

    return normalized;
  }
}
