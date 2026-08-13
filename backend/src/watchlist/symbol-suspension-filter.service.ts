import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import type { SymbolSuspensionFilterResult } from './symbol-suspension-filter.types';

const SUSPENDED_STATUSES = new Set(['suspended', 'halted']);

const INACTIVE_STATUSES = new Set(['inactive']);

@Injectable()
export class SymbolSuspensionFilterService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(symbol: string): Promise<SymbolSuspensionFilterResult> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const record = await this.prisma.tradingSymbol.findUnique({
      where: {
        symbol: normalizedSymbol,
      },
      select: {
        symbol: true,
        alpacaStatus: true,
      },
    });

    if (record === null) {
      return {
        symbol: normalizedSymbol,
        alpacaStatus: null,
        allowed: false,
        status: 'SYMBOL_NOT_FOUND',
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

    if (record.alpacaStatus === null) {
      return {
        symbol: normalizedSymbol,
        alpacaStatus: null,
        allowed: false,
        status: 'UNKNOWN_ASSET_STATUS',
        reason: 'Alpaca asset status has not been validated',
      };
    }

    const status = record.alpacaStatus.trim().toLowerCase();

    if (!status) {
      return {
        symbol: normalizedSymbol,
        alpacaStatus: record.alpacaStatus,
        allowed: false,
        status: 'UNKNOWN_ASSET_STATUS',
        reason: 'Alpaca asset status is invalid',
      };
    }

    if (SUSPENDED_STATUSES.has(status)) {
      return {
        symbol: normalizedSymbol,
        alpacaStatus: record.alpacaStatus,
        allowed: false,
        status: 'SUSPENDED',
        reason: 'Asset is suspended or halted',
      };
    }

    if (INACTIVE_STATUSES.has(status)) {
      return {
        symbol: normalizedSymbol,
        alpacaStatus: record.alpacaStatus,
        allowed: false,
        status: 'INACTIVE',
        reason: 'Asset is inactive',
      };
    }

    if (status !== 'active') {
      return {
        symbol: normalizedSymbol,
        alpacaStatus: record.alpacaStatus,
        allowed: false,
        status: 'UNKNOWN_ASSET_STATUS',
        reason: `Unsupported Alpaca asset status: ${record.alpacaStatus}`,
      };
    }

    return {
      symbol: normalizedSymbol,
      alpacaStatus: record.alpacaStatus,
      allowed: true,
      status: 'ALLOWED',
      reason: 'Asset status is active',
    };
  }

  async assertAllowed(symbol: string): Promise<void> {
    const result = await this.evaluate(symbol);

    if (result.allowed) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} failed suspension filter: ${result.status} - ${result.reason}`,
    );
  }
}
