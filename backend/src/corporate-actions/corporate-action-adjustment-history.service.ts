import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import type {
  CorporateActionAdjustmentHistoryRecord,
  CorporateActionAdjustmentType,
  RecordCorporateActionAdjustmentInput,
} from './corporate-action-adjustment-history.types';
import { CORPORATE_ACTION_ADJUSTMENT_TYPES } from './corporate-action-adjustment-history.types';
import type { CorporateActionType } from './corporate-actions.types';

@Injectable()
export class CorporateActionAdjustmentHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: RecordCorporateActionAdjustmentInput,
  ): Promise<CorporateActionAdjustmentHistoryRecord> {
    const corporateActionId = this.normalizeRequiredText(
      input.corporateActionId,
      'corporate action ID',
    );

    const corporateActionType = this.normalizeRequiredText(
      input.corporateActionType,
      'corporate action type',
    ) as CorporateActionType;

    const symbol =
      input.symbol === null ? null : this.normalizeSymbol(input.symbol);

    const processDate = this.cloneValidDate(input.processDate, 'process date');

    const adjustmentType = this.normalizeAdjustmentType(input.adjustmentType);

    const status = this.normalizeRequiredText(input.status, 'status');

    const details = this.cloneDetails(input.details);

    const created = await this.prisma.corporateActionAdjustmentHistory.create({
      data: {
        corporateActionId,
        corporateActionType,
        symbol,
        processDate,
        adjustmentType,
        status,
        details: details as Prisma.InputJsonValue,
      },
    });

    return {
      id: created.id,
      corporateActionId: created.corporateActionId,
      corporateActionType: created.corporateActionType as CorporateActionType,
      symbol: created.symbol,
      processDate: new Date(created.processDate),
      adjustmentType: created.adjustmentType as CorporateActionAdjustmentType,
      status: created.status,
      details: structuredClone(created.details as Record<string, unknown>),
      recordedAt: new Date(created.recordedAt),
    };
  }

  private normalizeAdjustmentType(
    value: CorporateActionAdjustmentType,
  ): CorporateActionAdjustmentType {
    if (!CORPORATE_ACTION_ADJUSTMENT_TYPES.includes(value)) {
      throw new Error('Invalid corporate action adjustment history type');
    }

    return value;
  }

  private normalizeRequiredText(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`Invalid corporate action adjustment history ${field}`);
    }

    return normalized;
  }

  private normalizeSymbol(value: string): string {
    const normalized = value.trim().toUpperCase();

    if (!normalized || normalized.length > 32 || /\s/.test(normalized)) {
      throw new Error('Invalid corporate action adjustment history symbol');
    }

    return normalized;
  }

  private cloneValidDate(value: Date, field: string): Date {
    const cloned = new Date(value.getTime());

    if (!Number.isFinite(cloned.getTime())) {
      throw new Error(`Invalid corporate action adjustment history ${field}`);
    }

    return cloned;
  }

  private cloneDetails(
    value: Readonly<Record<string, unknown>>,
  ): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Invalid corporate action adjustment history details');
    }

    return structuredClone(value);
  }
}
