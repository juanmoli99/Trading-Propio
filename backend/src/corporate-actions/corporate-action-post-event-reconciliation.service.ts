import { Injectable } from '@nestjs/common';
import { CorporateActionCostBasisReconciliationService } from './corporate-action-cost-basis-reconciliation.service';
import type { CorporateActionCostBasisReconciliationItem } from './corporate-action-cost-basis-reconciliation.types';
import { CorporateActionQuantityReconciliationService } from './corporate-action-quantity-reconciliation.service';
import type { CorporateActionQuantityReconciliationItem } from './corporate-action-quantity-reconciliation.types';
import type {
  CorporateActionPostEventReconciliationItem,
  CorporateActionPostEventReconciliationQuery,
  CorporateActionPostEventReconciliationResult,
  CorporateActionPostEventReconciliationStatus,
} from './corporate-action-post-event-reconciliation.types';

@Injectable()
export class CorporateActionPostEventReconciliationService {
  constructor(
    private readonly quantityReconciliationService: CorporateActionQuantityReconciliationService,
    private readonly costBasisReconciliationService: CorporateActionCostBasisReconciliationService,
  ) {}

  async reconcilePostEvent(
    query: CorporateActionPostEventReconciliationQuery = {},
  ): Promise<CorporateActionPostEventReconciliationResult> {
    const [quantityResult, costBasisResult] = await Promise.all([
      this.quantityReconciliationService.reconcileQuantity(query),
      this.costBasisReconciliationService.reconcileCostBasis(query),
    ]);

    this.assertSameReferenceDate(quantityResult.asOf, costBasisResult.asOf);

    const quantityById = this.indexQuantityItems(quantityResult.items);

    const costBasisById = this.indexCostBasisItems(costBasisResult.items);

    const actionIds = new Set<string>([
      ...quantityById.keys(),
      ...costBasisById.keys(),
    ]);

    const items: CorporateActionPostEventReconciliationItem[] = [];

    for (const actionId of actionIds) {
      const quantity = quantityById.get(actionId);
      const costBasis = costBasisById.get(actionId);

      if (!quantity || !costBasis) {
        throw new Error(
          `Incomplete post-event reconciliation data for corporate action ${actionId}`,
        );
      }

      this.assertSameCorporateAction(quantity, costBasis);

      items.push(this.buildItem(quantity, costBasis));
    }

    const matchedCount = this.countStatus(items, 'MATCHED');

    const mismatchCount = this.countStatus(items, 'MISMATCH');

    const notApplicableCount = this.countStatus(items, 'NOT_APPLICABLE');

    return {
      asOf: new Date(quantityResult.asOf.getTime()),
      items,
      matchedCount,
      mismatchCount,
      notApplicableCount,
      reconciliationSuccessful: mismatchCount === 0,
    };
  }

  private buildItem(
    quantity: CorporateActionQuantityReconciliationItem,
    costBasis: CorporateActionCostBasisReconciliationItem,
  ): CorporateActionPostEventReconciliationItem {
    const status = this.resolveStatus(quantity.status, costBasis.status);

    return {
      corporateActionId: this.normalizeId(quantity.corporateActionId),

      corporateActionType: quantity.corporateActionType,

      symbol:
        quantity.symbol === null ? null : this.normalizeSymbol(quantity.symbol),

      processDate: this.cloneProcessDate(
        quantity.processDate,
        quantity.corporateActionId,
      ),

      quantityStatus: quantity.status,
      costBasisStatus: costBasis.status,
      status,

      quantityReason: this.normalizeReason(
        quantity.reason,
        'quantity',
        quantity.corporateActionId,
      ),

      costBasisReason: this.normalizeReason(
        costBasis.reason,
        'cost basis',
        costBasis.corporateActionId,
      ),
    };
  }

  private resolveStatus(
    quantityStatus: 'MATCHED' | 'MISMATCH' | 'NOT_APPLICABLE',
    costBasisStatus: 'MATCHED' | 'MISMATCH' | 'NOT_APPLICABLE',
  ): CorporateActionPostEventReconciliationStatus {
    if (quantityStatus === 'MISMATCH' || costBasisStatus === 'MISMATCH') {
      return 'MISMATCH';
    }

    if (
      quantityStatus === 'NOT_APPLICABLE' &&
      costBasisStatus === 'NOT_APPLICABLE'
    ) {
      return 'NOT_APPLICABLE';
    }

    return 'MATCHED';
  }

  private indexQuantityItems(
    items: readonly CorporateActionQuantityReconciliationItem[],
  ): ReadonlyMap<string, CorporateActionQuantityReconciliationItem> {
    const indexed = new Map<
      string,
      CorporateActionQuantityReconciliationItem
    >();

    for (const item of items) {
      const id = this.normalizeId(item.corporateActionId);

      if (indexed.has(id)) {
        throw new Error(
          `Duplicate quantity reconciliation result for corporate action ${id}`,
        );
      }

      indexed.set(id, item);
    }

    return indexed;
  }

  private indexCostBasisItems(
    items: readonly CorporateActionCostBasisReconciliationItem[],
  ): ReadonlyMap<string, CorporateActionCostBasisReconciliationItem> {
    const indexed = new Map<
      string,
      CorporateActionCostBasisReconciliationItem
    >();

    for (const item of items) {
      const id = this.normalizeId(item.corporateActionId);

      if (indexed.has(id)) {
        throw new Error(
          `Duplicate cost-basis reconciliation result for corporate action ${id}`,
        );
      }

      indexed.set(id, item);
    }

    return indexed;
  }

  private assertSameReferenceDate(
    quantityAsOf: Date,
    costBasisAsOf: Date,
  ): void {
    const quantityMs = quantityAsOf.getTime();

    const costBasisMs = costBasisAsOf.getTime();

    if (!Number.isFinite(quantityMs) || !Number.isFinite(costBasisMs)) {
      throw new Error('Invalid post-event reconciliation reference date');
    }

    if (quantityMs !== costBasisMs) {
      throw new Error(
        'Post-event reconciliation sources use different reference dates',
      );
    }
  }

  private assertSameCorporateAction(
    quantity: CorporateActionQuantityReconciliationItem,
    costBasis: CorporateActionCostBasisReconciliationItem,
  ): void {
    if (quantity.corporateActionType !== costBasis.corporateActionType) {
      throw new Error(
        `Corporate action type mismatch during post-event reconciliation for ${quantity.corporateActionId}`,
      );
    }

    const quantitySymbol =
      quantity.symbol === null ? null : this.normalizeSymbol(quantity.symbol);

    const costBasisSymbol =
      costBasis.symbol === null ? null : this.normalizeSymbol(costBasis.symbol);

    if (quantitySymbol !== costBasisSymbol) {
      throw new Error(
        `Corporate action symbol mismatch during post-event reconciliation for ${quantity.corporateActionId}`,
      );
    }

    const quantityDate = quantity.processDate.getTime();

    const costBasisDate = costBasis.processDate.getTime();

    if (
      !Number.isFinite(quantityDate) ||
      !Number.isFinite(costBasisDate) ||
      quantityDate !== costBasisDate
    ) {
      throw new Error(
        `Corporate action process date mismatch during post-event reconciliation for ${quantity.corporateActionId}`,
      );
    }
  }

  private countStatus(
    items: readonly CorporateActionPostEventReconciliationItem[],
    status: CorporateActionPostEventReconciliationStatus,
  ): number {
    return items.filter((item) => item.status === status).length;
  }

  private normalizeId(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error('Invalid corporate action post-event reconciliation ID');
    }

    return normalized;
  }

  private normalizeSymbol(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error(
        'Invalid corporate action post-event reconciliation symbol',
      );
    }

    return normalized;
  }

  private normalizeReason(
    value: string,
    field: string,
    corporateActionId: string,
  ): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(
        `Invalid corporate action post-event reconciliation ${field} reason for ${corporateActionId}`,
      );
    }

    return normalized;
  }

  private cloneProcessDate(value: Date, corporateActionId: string): Date {
    const cloned = new Date(value.getTime());

    if (!Number.isFinite(cloned.getTime())) {
      throw new Error(
        `Invalid corporate action post-event reconciliation process date for ${corporateActionId}`,
      );
    }

    return cloned;
  }
}
