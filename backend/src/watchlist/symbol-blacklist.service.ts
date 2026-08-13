import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  SymbolBlacklistEntry,
  SymbolBlacklistEvaluation,
} from './symbol-blacklist.types';

@Injectable()
export class SymbolBlacklistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(
    symbol: string,
    reason?: string | null,
  ): Promise<SymbolBlacklistEntry> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const normalizedReason = this.normalizeOptionalReason(reason);

    const existing = await this.prisma.symbolBlacklistEntry.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
    });

    if (existing !== null) {
      if (existing.reason === normalizedReason) {
        return this.mapEntry(existing);
      }

      const updated = await this.prisma.symbolBlacklistEntry.update({
        where: {
          id: existing.id,
        },
        data: {
          reason: normalizedReason,
        },
      });

      return this.mapEntry(updated);
    }

    const created = await this.prisma.symbolBlacklistEntry.create({
      data: {
        symbol: normalizedSymbol,
        reason: normalizedReason,
      },
    });

    return this.mapEntry(created);
  }

  async remove(symbol: string): Promise<SymbolBlacklistEntry> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const existing = await this.prisma.symbolBlacklistEntry.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
    });

    if (existing === null) {
      throw new Error(`Blacklist symbol ${normalizedSymbol} does not exist`);
    }

    const removed = await this.prisma.symbolBlacklistEntry.delete({
      where: {
        id: existing.id,
      },
    });

    return this.mapEntry(removed);
  }

  async list(): Promise<readonly SymbolBlacklistEntry[]> {
    const entries = await this.prisma.symbolBlacklistEntry.findMany({
      orderBy: {
        symbol: 'asc',
      },
    });

    return entries.map((entry) => this.mapEntry(entry));
  }

  async evaluate(symbol: string): Promise<SymbolBlacklistEvaluation> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const entry = await this.prisma.symbolBlacklistEntry.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
    });

    if (entry === null) {
      return {
        symbol: normalizedSymbol,
        blocked: false,
        reason: null,
      };
    }

    const mapped = this.mapEntry(entry);

    return {
      symbol: mapped.symbol,
      blocked: true,
      reason: mapped.reason,
    };
  }

  async assertNotBlocked(symbol: string): Promise<void> {
    const result = await this.evaluate(symbol);

    if (!result.blocked) {
      return;
    }

    const suffix = result.reason === null ? '' : `: ${result.reason}`;

    throw new Error(`Symbol ${result.symbol} is blacklisted${suffix}`);
  }

  private mapEntry(entry: {
    id: string;
    symbol: string;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SymbolBlacklistEntry {
    const id = entry.id.trim();

    if (!id) {
      throw new Error('Invalid blacklist entry ID');
    }

    const symbol = normalizeTradingSymbol(entry.symbol);

    const reason = this.normalizeOptionalReason(entry.reason);

    const createdAt = this.cloneDate(entry.createdAt, 'createdAt', symbol);

    const updatedAt = this.cloneDate(entry.updatedAt, 'updatedAt', symbol);

    if (updatedAt.getTime() < createdAt.getTime()) {
      throw new Error(
        `Blacklist entry ${symbol} has updatedAt before createdAt`,
      );
    }

    return {
      id,
      symbol,
      reason,
      createdAt,
      updatedAt,
    };
  }

  private normalizeOptionalReason(
    value: string | null | undefined,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new Error('Invalid blacklist reason');
    }

    if (normalized.length > 500) {
      throw new Error('Blacklist reason is too long');
    }

    return normalized;
  }

  private cloneDate(value: Date, field: string, symbol: string): Date {
    const cloned = new Date(value.getTime());

    if (!Number.isFinite(cloned.getTime())) {
      throw new Error(`Invalid blacklist ${field} for ${symbol}`);
    }

    return cloned;
  }
}
