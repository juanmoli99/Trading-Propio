import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type { SymbolTradableFilterResult } from './symbol-tradable-filter.types';

@Injectable()
export class SymbolTradableFilterService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(symbol: string): Promise<SymbolTradableFilterResult> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const record = await this.prisma.tradingSymbol.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
      select: {
        symbol: true,
        tradable: true,
      },
    });

    if (record === null) {
      return {
        symbol: normalizedSymbol,
        allowed: false,
        status: 'SYMBOL_NOT_FOUND',
        tradable: null,
        reason:
          'Trading symbol does not exist in the canonical symbol registry',
      };
    }

    const persistedSymbol = normalizeTradingSymbol(record.symbol);

    if (persistedSymbol !== normalizedSymbol) {
      throw new Error(
        `Trading symbol lookup returned ${persistedSymbol} while evaluating ${normalizedSymbol}`,
      );
    }

    if (record.tradable === null) {
      return {
        symbol: normalizedSymbol,
        allowed: false,
        status: 'UNKNOWN_TRADABLE_STATE',
        tradable: null,
        reason: 'Tradable state has not been validated against Alpaca',
      };
    }

    if (!record.tradable) {
      return {
        symbol: normalizedSymbol,
        allowed: false,
        status: 'NOT_TRADABLE',
        tradable: false,
        reason: 'Alpaca marks the symbol as not tradable',
      };
    }

    return {
      symbol: normalizedSymbol,
      allowed: true,
      status: 'ALLOWED',
      tradable: true,
      reason: 'Alpaca marks the symbol as tradable',
    };
  }

  async assertTradable(symbol: string): Promise<void> {
    const result = await this.evaluate(symbol);

    if (result.allowed) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} failed tradable filter: ${result.status} - ${result.reason}`,
    );
  }
}
