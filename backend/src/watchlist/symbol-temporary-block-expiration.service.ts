import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type { SymbolTemporaryBlockExpirationResult } from './symbol-temporary-block-expiration.types';

@Injectable()
export class SymbolTemporaryBlockExpirationService {
  constructor(private readonly prisma: PrismaService) {}

  async removeExpired(
    asOf: Date = new Date(),
  ): Promise<SymbolTemporaryBlockExpirationResult> {
    const referenceTime = this.cloneValidDate(asOf);

    const expired = await this.prisma.symbolTemporaryBlock.findMany({
      where: {
        expiresAt: {
          lte: referenceTime,
        },
      },
      select: {
        id: true,
        symbol: true,
      },
      orderBy: {
        symbol: 'asc',
      },
    });

    if (expired.length === 0) {
      return {
        asOf: new Date(referenceTime.getTime()),
        removedCount: 0,
        removedSymbols: [],
      };
    }

    const ids = expired.map((entry) => entry.id);

    const removedSymbols = expired.map((entry) =>
      normalizeTradingSymbol(entry.symbol),
    );

    const deleted = await this.prisma.symbolTemporaryBlock.deleteMany({
      where: {
        id: {
          in: ids,
        },
        expiresAt: {
          lte: referenceTime,
        },
      },
    });

    if (deleted.count !== expired.length) {
      throw new Error(
        `Temporary block expiration cleanup expected to remove ${expired.length} records but removed ${deleted.count}`,
      );
    }

    return {
      asOf: new Date(referenceTime.getTime()),
      removedCount: deleted.count,
      removedSymbols,
    };
  }

  async removeExpiredForSymbol(
    symbol: string,
    asOf: Date = new Date(),
  ): Promise<boolean> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const referenceTime = this.cloneValidDate(asOf);

    const result = await this.prisma.symbolTemporaryBlock.deleteMany({
      where: {
        symbol: normalizedSymbol,
        expiresAt: {
          lte: referenceTime,
        },
      },
    });

    if (result.count > 1) {
      throw new Error(
        `Temporary block cleanup removed multiple records for ${normalizedSymbol}`,
      );
    }

    return result.count === 1;
  }

  private cloneValidDate(value: Date): Date {
    const cloned = new Date(value.getTime());

    if (!Number.isFinite(cloned.getTime())) {
      throw new Error('Invalid temporary block expiration reference timestamp');
    }

    return cloned;
  }
}
