import { Injectable } from '@nestjs/common';
import { CorporateActionsService } from './corporate-actions.service';
import type { CorporateActionRecord } from './corporate-actions.types';
import type {
  CorporateActionNameChange,
  CorporateActionNameChangeQuery,
  CorporateActionNameChangeResult,
} from './corporate-action-name-change.types';

@Injectable()
export class CorporateActionNameChangeService {
  constructor(
    private readonly corporateActionsService: CorporateActionsService,
  ) {}

  async getNameChanges(
    query: CorporateActionNameChangeQuery,
  ): Promise<CorporateActionNameChangeResult> {
    const symbol = this.normalizeSymbol(query.symbol);

    const result =
      await this.corporateActionsService.getAllCorporateActions({
        symbols: [symbol],
        types: ['name_change'],
        start: query.start,
        end: query.end,
        sort: 'asc',
      });

    const changes = result.items
      .filter(
        (
          item,
        ): item is CorporateActionRecord & {
          type: 'name_change';
        } => item.type === 'name_change',
      )
      .map((item) => this.normalizeNameChange(item));

    return {
      symbol,
      changes,
    };
  }

  private normalizeNameChange(
    action: CorporateActionRecord & {
      type: 'name_change';
    },
  ): CorporateActionNameChange {
    if (action.symbol === null) {
      throw new Error(
        `Corporate action name change ${action.id} is missing symbol`,
      );
    }

    if (action.processDate === null) {
      throw new Error(
        `Corporate action name change ${action.id} is missing process date`,
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

    const oldName = this.optionalName(
      action.raw.old_name,
      'old_name',
      action.id,
    );

    const newName = this.optionalName(
      action.raw.new_name,
      'new_name',
      action.id,
    );

    const symbolChanged = oldSymbol !== newSymbol;

    const nameChanged =
      oldName !== null &&
      newName !== null &&
      oldName !== newName;

    if (!symbolChanged && !nameChanged) {
      throw new Error(
        `Corporate action name change ${action.id} contains no effective symbol or name change`,
      );
    }

    return {
      id: action.id,
      symbol: action.symbol,
      processDate: new Date(action.processDate),
      oldSymbol,
      newSymbol,
      oldName,
      newName,
      symbolChanged,
      nameChanged,
    };
  }

  private requireSymbol(
    value: unknown,
    field: string,
    id: string,
  ): string {
    if (typeof value !== 'string') {
      throw new Error(
        `Invalid corporate action name change ${field} for ${id}`,
      );
    }

    const normalized = this.normalizeSymbol(value);

    return normalized;
  }

  private optionalName(
    value: unknown,
    field: string,
    id: string,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error(
        `Invalid corporate action name change ${field} for ${id}`,
      );
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new Error(
        `Invalid corporate action name change ${field} for ${id}`,
      );
    }

    return normalized;
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error(
        'Invalid corporate action name change symbol',
      );
    }

    return normalized;
  }
}