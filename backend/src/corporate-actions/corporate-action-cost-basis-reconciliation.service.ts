import { Injectable } from '@nestjs/common';
import { CorporateActionPositionAssociationService } from './corporate-action-position-association.service';
import type { CorporateActionPositionAssociation } from './corporate-action-position-association.types';
import type {
  CorporateActionCostBasisReconciliationItem,
  CorporateActionCostBasisReconciliationQuery,
  CorporateActionCostBasisReconciliationResult,
} from './corporate-action-cost-basis-reconciliation.types';

const COST_BASIS_EPSILON = 1e-8;

@Injectable()
export class CorporateActionCostBasisReconciliationService {
  constructor(
    private readonly positionAssociationService:
      CorporateActionPositionAssociationService,
  ) {}

  async reconcileCostBasis(
    query: CorporateActionCostBasisReconciliationQuery = {},
  ): Promise<CorporateActionCostBasisReconciliationResult> {
    const associations =
      await this.positionAssociationService.associateWithExistingPositions(
        query,
      );

    const items = associations.associations.map(
      (association) =>
        this.reconcileAssociation(association),
    );

    return {
      asOf: new Date(associations.asOf),
      items,
      matchedCount: items.filter(
        (item) => item.status === 'MATCHED',
      ).length,
      mismatchCount: items.filter(
        (item) => item.status === 'MISMATCH',
      ).length,
      notApplicableCount: items.filter(
        (item) => item.status === 'NOT_APPLICABLE',
      ).length,
    };
  }

  private reconcileAssociation(
    association: CorporateActionPositionAssociation,
  ): CorporateActionCostBasisReconciliationItem {
    const action = association.corporateAction;

    if (
      !association.hasExistingPosition ||
      association.position === null
    ) {
      return this.notApplicable(
        association,
        'No existing position is associated with the corporate action',
      );
    }

    if (!this.preservesTotalCostBasis(action.type)) {
      return this.notApplicable(
        association,
        `Corporate action type ${action.type} does not provide an unambiguous total cost basis adjustment`,
      );
    }

    const currentCostBasis = this.requirePositiveFinancialNumber(
      association.position.costBasis,
      'current position cost basis',
      action.id,
    );

    const previousCostBasis = this.resolvePreviousCostBasis(
      action.raw,
      action.id,
    );

    if (previousCostBasis === null) {
      return this.notApplicable(
        association,
        'Pre-event cost basis is unavailable for deterministic reconciliation',
      );
    }

    const matched =
      Math.abs(currentCostBasis - previousCostBasis) <=
      COST_BASIS_EPSILON;

    return {
      corporateActionId: action.id,
      corporateActionType: action.type,
      symbol: action.symbol,
      processDate: new Date(action.processDate),
      currentCostBasis: association.position.costBasis,
      expectedCostBasis:
        this.formatFinancialValue(previousCostBasis),
      status: matched ? 'MATCHED' : 'MISMATCH',
      reason: matched
        ? 'Broker cost basis matches the expected post-event total cost basis'
        : 'Broker cost basis differs from the expected post-event total cost basis',
    };
  }

  private preservesTotalCostBasis(
    type: string,
  ): boolean {
    return (
      type === 'forward_split' ||
      type === 'reverse_split' ||
      type === 'stock_dividend'
    );
  }

  private resolvePreviousCostBasis(
    raw: Readonly<Record<string, unknown>>,
    actionId: string,
  ): number | null {
    const candidate =
      raw.previous_cost_basis ??
      raw.pre_event_cost_basis ??
      raw.cost_basis_before;

    if (candidate === undefined || candidate === null) {
      return null;
    }

    return this.requirePositiveFinancialNumber(
      candidate,
      'pre-event cost basis',
      actionId,
    );
  }

  private notApplicable(
    association: CorporateActionPositionAssociation,
    reason: string,
  ): CorporateActionCostBasisReconciliationItem {
    const action = association.corporateAction;

    return {
      corporateActionId: action.id,
      corporateActionType: action.type,
      symbol: action.symbol,
      processDate: new Date(action.processDate),
      currentCostBasis:
        association.position?.costBasis ?? null,
      expectedCostBasis: null,
      status: 'NOT_APPLICABLE',
      reason,
    };
  }

  private requirePositiveFinancialNumber(
    value: unknown,
    field: string,
    actionId: string,
  ): number {
    const number =
      typeof value === 'number'
        ? value
        : typeof value === 'string' &&
            value.trim().length > 0
          ? Number(value)
          : Number.NaN;

    if (
      !Number.isFinite(number) ||
      number <= 0
    ) {
      throw new Error(
        `Invalid corporate action ${field} for ${actionId}`,
      );
    }

    return number;
  }

  private formatFinancialValue(
    value: number,
  ): string {
    const normalized = value
      .toFixed(12)
      .replace(/\.?0+$/, '');

    if (!normalized) {
      throw new Error(
        'Corporate action expected cost basis could not be formatted',
      );
    }

    return normalized;
  }
}