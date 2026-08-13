import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type {
  SymbolWhitelistEntry,
  SymbolWhitelistEvaluation,
} from './symbol-whitelist.types';

@Injectable()
export class SymbolWhitelistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(symbol: string): Promise<SymbolWhitelistEntry> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const existing = await this.prisma.symbolWhitelistEntry.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
    });

    if (existing !== null) {
      return this.mapEntry(existing);
    }

    const created = await this.prisma.symbolWhitelistEntry.create({
      data: {
        symbol: normalizedSymbol,
      },
    });

    return this.mapEntry(created);
  }

  async remove(symbol: string): Promise<SymbolWhitelistEntry> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const existing = await this.prisma.symbolWhitelistEntry.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
    });

    if (existing === null) {
      throw new Error(`Whitelist symbol ${normalizedSymbol} does not exist`);
    }

    const removed = await this.prisma.symbolWhitelistEntry.delete({
      where: {
        id: existing.id,
      },
    });

    return this.mapEntry(removed);
  }

  async list(): Promise<readonly SymbolWhitelistEntry[]> {
    const entries = await this.prisma.symbolWhitelistEntry.findMany({
      orderBy: {
        symbol: 'asc',
      },
    });

    return entries.map((entry) => this.mapEntry(entry));
  }

  async evaluate(symbol: string): Promise<SymbolWhitelistEvaluation> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const total = await this.prisma.symbolWhitelistEntry.count();

    if (total === 0) {
      return {
        symbol: normalizedSymbol,
        whitelistEnabled: false,
        allowed: true,
      };
    }

    const entry = await this.prisma.symbolWhitelistEntry.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
      select: {
        id: true,
      },
    });

    return {
      symbol: normalizedSymbol,
      whitelistEnabled: true,
      allowed: entry !== null,
    };
  }

  async assertAllowed(symbol: string): Promise<void> {
    const result = await this.evaluate(symbol);

    if (result.allowed) {
      return;
    }

    throw new Error(`Symbol ${result.symbol} is not allowed by whitelist`);
  }

  private mapEntry(entry: {
    id: string;
    symbol: string;
    createdAt: Date;
    updatedAt: Date;
  }): SymbolWhitelistEntry {
    const id = entry.id.trim();

    if (!id) {
      throw new Error('Invalid whitelist entry ID');
    }

    const symbol = normalizeTradingSymbol(entry.symbol);

    const createdAt = this.cloneDate(entry.createdAt, 'createdAt', symbol);

    const updatedAt = this.cloneDate(entry.updatedAt, 'updatedAt', symbol);

    if (updatedAt.getTime() < createdAt.getTime()) {
      throw new Error(
        `Whitelist entry ${symbol} has updatedAt before createdAt`,
      );
    }

    return {
      id,
      symbol,
      createdAt,
      updatedAt,
    };
  }

  private cloneDate(value: Date, field: string, symbol: string): Date {
    const cloned = new Date(value.getTime());

    if (!Number.isFinite(cloned.getTime())) {
      throw new Error(`Invalid whitelist ${field} for ${symbol}`);
    }

    return cloned;
  }
}
