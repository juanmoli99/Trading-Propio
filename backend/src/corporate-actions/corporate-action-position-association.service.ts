import { Injectable } from '@nestjs/common';
import { AlpacaPositionService } from '../alpaca/alpaca-position.service';
import type { AlpacaPosition } from '../alpaca/alpaca-position.types';
import { CorporateActionEffectiveService } from './corporate-action-effective.service';
import type { CorporateActionEffectiveRecord } from './corporate-action-effective.types';
import type {
  CorporateActionPositionAssociation,
  CorporateActionPositionAssociationQuery,
  CorporateActionPositionAssociationResult,
} from './corporate-action-position-association.types';

@Injectable()
export class CorporateActionPositionAssociationService {
  constructor(
    private readonly effectiveService: CorporateActionEffectiveService,
    private readonly positionService: AlpacaPositionService,
  ) {}

  async associateWithExistingPositions(
    query: CorporateActionPositionAssociationQuery = {},
  ): Promise<CorporateActionPositionAssociationResult> {
    const [effectiveResult, positions] = await Promise.all([
      this.effectiveService.getEffectiveActions(query),
      this.positionService.getPositions(),
    ]);

    const positionsBySymbol = this.indexPositions(positions);

    const associations = effectiveResult.effective.map(
      (action) =>
        this.associateAction(
          action,
          positionsBySymbol,
        ),
    );

    const matchedCount = associations.filter(
      (association) => association.hasExistingPosition,
    ).length;

    return {
      asOf: new Date(effectiveResult.asOf),
      associations,
      matchedCount,
      unmatchedCount: associations.length - matchedCount,
    };
  }

  private indexPositions(
    positions: readonly AlpacaPosition[],
  ): ReadonlyMap<string, AlpacaPosition> {
    const indexed = new Map<string, AlpacaPosition>();

    for (const position of positions) {
      const symbol = this.normalizeSymbol(position.symbol);

      if (indexed.has(symbol)) {
        throw new Error(
          `Duplicate Alpaca position detected for symbol ${symbol}`,
        );
      }

      indexed.set(
        symbol,
        this.clonePosition(position),
      );
    }

    return indexed;
  }

  private associateAction(
    action: CorporateActionEffectiveRecord,
    positionsBySymbol: ReadonlyMap<string, AlpacaPosition>,
  ): CorporateActionPositionAssociation {
    if (action.symbol === null) {
      return {
        corporateAction: this.cloneAction(action),
        position: null,
        hasExistingPosition: false,
      };
    }

    const symbol = this.normalizeSymbol(action.symbol);
    const position = positionsBySymbol.get(symbol);

    return {
      corporateAction: this.cloneAction(action),
      position:
        position === undefined
          ? null
          : this.clonePosition(position),
      hasExistingPosition: position !== undefined,
    };
  }

  private cloneAction(
    action: CorporateActionEffectiveRecord,
  ): CorporateActionEffectiveRecord {
    return {
      id: action.id,
      type: action.type,
      symbol: action.symbol,
      processDate: new Date(action.processDate),
      raw: structuredClone(action.raw),
    };
  }

  private clonePosition(
    position: AlpacaPosition,
  ): AlpacaPosition {
    return {
      ...position,
    };
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        'Invalid corporate action position association symbol',
      );
    }

    return normalized;
  }
}