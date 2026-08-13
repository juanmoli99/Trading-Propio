import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  SymbolTemporaryBlockEntry,
  SymbolTemporaryBlockEvaluation,
} from './symbol-temporary-block.types';

@Injectable()
export class SymbolTemporaryBlockService {
  constructor(private readonly prisma: PrismaService) {}

  async block(
    symbol: string,
    reason: string,
    expiresAt: Date,
  ): Promise<SymbolTemporaryBlockEntry> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const normalizedReason = this.normalizeReason(reason);

    const normalizedExpiresAt = this.cloneValidDate(
      expiresAt,
      'expiresAt',
      normalizedSymbol,
    );

    const now = new Date();

    if (normalizedExpiresAt.getTime() <= now.getTime()) {
      throw new Error(
        'Temporary symbol block expiration must be in the future',
      );
    }

    const persisted = await this.prisma.symbolTemporaryBlock.upsert({
      where: {
        symbol: normalizedSymbol,
      },
      create: {
        symbol: normalizedSymbol,
        reason: normalizedReason,
        blockedAt: now,
        expiresAt: normalizedExpiresAt,
      },
      update: {
        reason: normalizedReason,
        blockedAt: now,
        expiresAt: normalizedExpiresAt,
      },
    });

    return this.mapEntry(persisted);
  }

  async remove(symbol: string): Promise<SymbolTemporaryBlockEntry> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const existing = await this.prisma.symbolTemporaryBlock.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
    });

    if (existing === null) {
      throw new Error(`Temporary block for ${normalizedSymbol} does not exist`);
    }

    const deleted = await this.prisma.symbolTemporaryBlock.delete({
      where: {
        id: existing.id,
      },
    });

    return this.mapEntry(deleted);
  }

  async evaluate(
    symbol: string,
    asOf: Date = new Date(),
  ): Promise<SymbolTemporaryBlockEvaluation> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const referenceTime = this.cloneValidDate(asOf, 'asOf', normalizedSymbol);

    const existing = await this.prisma.symbolTemporaryBlock.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
    });

    if (existing === null) {
      return {
        symbol: normalizedSymbol,
        blocked: false,
        reason: null,
        blockedAt: null,
        expiresAt: null,
      };
    }

    const mapped = this.mapEntry(existing);

    const blocked = mapped.expiresAt.getTime() > referenceTime.getTime();

    return {
      symbol: mapped.symbol,
      blocked,
      reason: blocked ? mapped.reason : null,
      blockedAt: blocked ? new Date(mapped.blockedAt) : null,
      expiresAt: blocked ? new Date(mapped.expiresAt) : null,
    };
  }

  async assertNotBlocked(
    symbol: string,
    asOf: Date = new Date(),
  ): Promise<void> {
    const result = await this.evaluate(symbol, asOf);

    if (!result.blocked) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} is temporarily blocked until ${result.expiresAt?.toISOString()}: ${result.reason}`,
    );
  }

  private mapEntry(entry: {
    id: string;
    symbol: string;
    reason: string;
    blockedAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): SymbolTemporaryBlockEntry {
    const id = entry.id.trim();

    if (!id) {
      throw new Error('Invalid temporary symbol block ID');
    }

    const symbol = normalizeTradingSymbol(entry.symbol);

    const reason = this.normalizeReason(entry.reason);

    const blockedAt = this.cloneValidDate(entry.blockedAt, 'blockedAt', symbol);

    const expiresAt = this.cloneValidDate(entry.expiresAt, 'expiresAt', symbol);

    const createdAt = this.cloneValidDate(entry.createdAt, 'createdAt', symbol);

    const updatedAt = this.cloneValidDate(entry.updatedAt, 'updatedAt', symbol);

    if (expiresAt.getTime() <= blockedAt.getTime()) {
      throw new Error(
        `Temporary symbol block ${symbol} has invalid expiration`,
      );
    }

    return {
      id,
      symbol,
      reason,
      blockedAt,
      expiresAt,
      createdAt,
      updatedAt,
    };
  }

  private normalizeReason(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error('Temporary symbol block reason is required');
    }

    if (normalized.length > 500) {
      throw new Error('Temporary symbol block reason is too long');
    }

    return normalized;
  }

  private cloneValidDate(value: Date, field: string, symbol: string): Date {
    const cloned = new Date(value.getTime());

    if (!Number.isFinite(cloned.getTime())) {
      throw new Error(`Invalid temporary symbol block ${field} for ${symbol}`);
    }

    return cloned;
  }
}
