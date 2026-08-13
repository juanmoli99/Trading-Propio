import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import { mapWatchlistRecord } from './watchlist.mapper';
import type {
  CreateWatchlistPersistenceInput,
  UpdateWatchlistPersistenceInput,
  WatchlistEntry,
} from './watchlist.types';

@Injectable()
export class WatchlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<readonly WatchlistEntry[]> {
    const records = await this.prisma.watchlistSymbol.findMany({
      orderBy: {
        symbol: 'asc',
      },
    });

    return records.map(mapWatchlistRecord);
  }

  async findBySymbol(symbol: string): Promise<WatchlistEntry | null> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const record = await this.prisma.watchlistSymbol.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
    });

    return record === null ? null : mapWatchlistRecord(record);
  }

  async findById(id: string): Promise<WatchlistEntry | null> {
    const normalizedId = this.normalizeId(id);

    const record = await this.prisma.watchlistSymbol.findUnique({
      where: {
        id: normalizedId,
      },
    });

    return record === null ? null : mapWatchlistRecord(record);
  }

  async create(
    input: CreateWatchlistPersistenceInput,
  ): Promise<WatchlistEntry> {
    const symbol = normalizeTradingSymbol(input.symbol);

    const tradingSymbolId = this.normalizeOptionalId(input.tradingSymbolId);

    const created = await this.prisma.watchlistSymbol.create({
      data: {
        symbol,
        tradingSymbolId,
      },
    });

    return mapWatchlistRecord(created);
  }

  async update(
    id: string,
    input: UpdateWatchlistPersistenceInput,
  ): Promise<WatchlistEntry> {
    const normalizedId = this.normalizeId(id);

    const data: {
      tradingSymbolId?: string | null;
      status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
      version: {
        increment: number;
      };
    } = {
      version: {
        increment: 1,
      },
    };

    if (input.tradingSymbolId !== undefined) {
      data.tradingSymbolId = this.normalizeOptionalId(input.tradingSymbolId);
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    const updated = await this.prisma.watchlistSymbol.update({
      where: {
        id: normalizedId,
      },
      data,
    });

    return mapWatchlistRecord(updated);
  }

  async deleteById(id: string): Promise<WatchlistEntry> {
    const normalizedId = this.normalizeId(id);

    const deleted = await this.prisma.watchlistSymbol.delete({
      where: {
        id: normalizedId,
      },
    });

    return mapWatchlistRecord(deleted);
  }

  private normalizeId(value: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error('Watchlist ID is required');
    }

    return normalized;
  }

  private normalizeOptionalId(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new Error('Invalid watchlist trading symbol ID');
    }

    return normalized;
  }
}
