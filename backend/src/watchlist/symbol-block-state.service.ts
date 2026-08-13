import { Injectable } from '@nestjs/common';
import { normalizeTradingSymbol } from '../symbols/symbol-model';
import { SymbolBlacklistService } from './symbol-blacklist.service';
import type { SymbolBlockStateResult } from './symbol-block-state.types';
import { SymbolSuspensionFilterService } from './symbol-suspension-filter.service';
import { SymbolTemporaryBlockService } from './symbol-temporary-block.service';
import { SymbolTradableFilterService } from './symbol-tradable-filter.service';
import { SymbolWhitelistService } from './symbol-whitelist.service';

@Injectable()
export class SymbolBlockStateService {
  constructor(
    private readonly blacklistService: SymbolBlacklistService,
    private readonly whitelistService: SymbolWhitelistService,
    private readonly tradableFilter: SymbolTradableFilterService,
    private readonly suspensionFilter: SymbolSuspensionFilterService,
    private readonly temporaryBlockService: SymbolTemporaryBlockService,
  ) {}

  async evaluate(
    symbol: string,
    asOf: Date = new Date(),
  ): Promise<SymbolBlockStateResult> {
    const normalizedSymbol = normalizeTradingSymbol(symbol);

    const blacklist = await this.blacklistService.evaluate(normalizedSymbol);

    if (blacklist.blocked) {
      return {
        symbol: normalizedSymbol,
        blocked: true,
        status: 'BLACKLISTED',
        reason: blacklist.reason ?? 'Symbol is blacklisted',
        temporaryBlockExpiresAt: null,
      };
    }

    const whitelist = await this.whitelistService.evaluate(normalizedSymbol);

    if (!whitelist.allowed) {
      return {
        symbol: normalizedSymbol,
        blocked: true,
        status: 'NOT_WHITELISTED',
        reason: 'Symbol is not allowed by whitelist',
        temporaryBlockExpiresAt: null,
      };
    }

    const tradable = await this.tradableFilter.evaluate(normalizedSymbol);

    if (!tradable.allowed) {
      return {
        symbol: normalizedSymbol,
        blocked: true,
        status: 'NOT_TRADABLE',
        reason: `${tradable.status}: ${tradable.reason}`,
        temporaryBlockExpiresAt: null,
      };
    }

    const suspension = await this.suspensionFilter.evaluate(normalizedSymbol);

    if (!suspension.allowed) {
      return {
        symbol: normalizedSymbol,
        blocked: true,
        status: 'SUSPENDED',
        reason: `${suspension.status}: ${suspension.reason}`,
        temporaryBlockExpiresAt: null,
      };
    }

    const temporary = await this.temporaryBlockService.evaluate(
      normalizedSymbol,
      asOf,
    );

    if (temporary.blocked) {
      return {
        symbol: normalizedSymbol,
        blocked: true,
        status: 'TEMPORARILY_BLOCKED',
        reason: temporary.reason ?? 'Symbol is temporarily blocked',
        temporaryBlockExpiresAt:
          temporary.expiresAt === null
            ? null
            : new Date(temporary.expiresAt.getTime()),
      };
    }

    return {
      symbol: normalizedSymbol,
      blocked: false,
      status: 'ALLOWED',
      reason: null,
      temporaryBlockExpiresAt: null,
    };
  }

  async assertAllowed(symbol: string, asOf: Date = new Date()): Promise<void> {
    const result = await this.evaluate(symbol, asOf);

    if (!result.blocked) {
      return;
    }

    throw new Error(
      `Symbol ${result.symbol} is blocked: ${result.status}${
        result.reason === null ? '' : ` - ${result.reason}`
      }`,
    );
  }
}
