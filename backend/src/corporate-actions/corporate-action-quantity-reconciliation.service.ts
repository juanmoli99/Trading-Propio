import { Injectable } from '@nestjs/common';
import { CorporateActionPositionAssociationService } from './corporate-action-position-association.service';
import type {
  CorporateActionPositionAssociation,
  CorporateActionPositionAssociationResult,
} from './corporate-action-position-association.types';
import type {
  CorporateActionQuantityReconciliationItem,
  CorporateActionQuantityReconciliationQuery,
  CorporateActionQuantityReconciliationResult,
} from './corporate-action-quantity-reconciliation.types';

const QUANTITY_EPSILON = 1e-9;

@Injectable()
export class CorporateActionQuantityReconciliationService {
  constructor(
    private readonly positionAssociationService:
      CorporateActionPositionAssociationService,
  ) {}

  async reconcileQuantity(
    query: CorporateActionQuantityReconciliationQuery = {},
  ): Promise<CorporateActionQuantityReconciliationResult> {
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
  ): CorporateActionQuantityReconciliationItem {
    const action = association.corporateAction;

    if (!association.hasExistingPosition || association.position === null) {
      return {
        corporateActionId: action.id,
        corporateActionType: action.type,
        symbol: action.symbol,
        processDate: new Date(action.processDate),
        currentQuantity: null,
        expectedQuantity: null,
        quantityFactor: null,
        status: 'NOT_APPLICABLE',
        reason: 'No existing position is associated with the corporate action',
      };
    }

    const currentQuantity = this.requirePositiveNumber(
      association.position.quantity,
      'current position quantity',
      action.id,
    );

    const quantityFactor = this.resolveQuantityFactor(association);

    if (quantityFactor === null) {
      return {
        corporateActionId: action.id,
        corporateActionType: action.type,
        symbol: action.symbol,
        processDate: new Date(action.processDate),
        currentQuantity: association.position.quantity,
        expectedQuantity: null,
        quantityFactor: null,
        status: 'NOT_APPLICABLE',
        reason: `Corporate action type ${action.type} does not provide an unambiguous quantity adjustment`,
      };
    }

    const preEventQuantity = this.resolvePreEventQuantity(
      action.raw,
      action.id,
    );

    if (preEventQuantity === null) {
      return {
        corporateActionId: action.id,
        corporateActionType: action.type,
        symbol: action.symbol,
        processDate: new Date(action.processDate),
        currentQuantity: association.position.quantity,
        expectedQuantity: null,
        quantityFactor,
        status: 'NOT_APPLICABLE',
        reason: 'Pre-event quantity is unavailable for deterministic reconciliation',
      };
    }

    const expectedQuantity = preEventQuantity * quantityFactor;

    if (
      !Number.isFinite(expectedQuantity) ||
      expectedQuantity <= 0
    ) {
      throw new Error(
        `Invalid expected corporate action quantity for ${action.id}`,
      );
    }

    const matched =
      Math.abs(currentQuantity - expectedQuantity) <=
      QUANTITY_EPSILON;

    return {
      corporateActionId: action.id,
      corporateActionType: action.type,
      symbol: action.symbol,
      processDate: new Date(action.processDate),
      currentQuantity: association.position.quantity,
      expectedQuantity: this.formatQuantity(expectedQuantity),
      quantityFactor,
      status: matched ? 'MATCHED' : 'MISMATCH',
      reason: matched
        ? 'Broker quantity matches the expected post-event quantity'
        : 'Broker quantity differs from the expected post-event quantity',
    };
  }

  private resolveQuantityFactor(
    association: CorporateActionPositionAssociation,
  ): number | null {
    const action = association.corporateAction;

    if (
      action.type === 'forward_split' ||
      action.type === 'reverse_split'
    ) {
      const oldRate = this.requirePositiveNumber(
        action.raw.old_rate,
        'old_rate',
        action.id,
      );

      const newRate = this.requirePositiveNumber(
        action.raw.new_rate,
        'new_rate',
        action.id,
      );

      const factor = newRate / oldRate;

      if (!Number.isFinite(factor) || factor <= 0) {
        throw new Error(
          `Invalid corporate action split quantity factor for ${action.id}`,
        );
      }

      if (
        action.type === 'forward_split' &&
        factor <= 1
      ) {
        throw new Error(
          `Invalid forward split quantity factor for ${action.id}`,
        );
      }

      if (
        action.type === 'reverse_split' &&
        factor >= 1
      ) {
        throw new Error(
          `Invalid reverse split quantity factor for ${action.id}`,
        );
      }

      return factor;
    }

    if (action.type === 'stock_dividend') {
      const rate = this.requirePositiveNumber(
        action.raw.rate,
        'rate',
        action.id,
      );

      const factor = 1 + rate;

      if (!Number.isFinite(factor) || factor <= 1) {
        throw new Error(
          `Invalid stock dividend quantity factor for ${action.id}`,
        );
      }

      return factor;
    }

    return null;
  }

  private resolvePreEventQuantity(
    raw: Readonly<Record<string, unknown>>,
    actionId: string,
  ): number | null {
    const candidate =
      raw.previous_quantity ??
      raw.pre_event_quantity ??
      raw.quantity_before;

    if (candidate === undefined || candidate === null) {
      return null;
    }

    return this.requirePositiveNumber(
      candidate,
      'pre-event quantity',
      actionId,
    );
  }

  private requirePositiveNumber(
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

  private formatQuantity(value: number): string {
    const normalized = value.toFixed(12).replace(/\.?0+$/, '');

    if (!normalized) {
      throw new Error(
        'Corporate action expected quantity could not be formatted',
      );
    }

    return normalized;
  }
}