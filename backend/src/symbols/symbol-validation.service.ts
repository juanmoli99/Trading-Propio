import { Injectable } from '@nestjs/common';
import { AlpacaAssetService } from '../alpaca/alpaca-asset.service';
import type { AlpacaAsset } from '../alpaca/alpaca-asset.types';
import { PrismaService } from '../database/prisma.service';
import { mapTradingSymbolRecord, normalizeTradingSymbol } from './symbol-model';
import type {
  SymbolValidationResult,
  SymbolValidationStatus,
  ValidateTradingSymbolInput,
} from './symbol-validation.types';

@Injectable()
export class SymbolValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alpacaAssetService: AlpacaAssetService,
  ) {}

  async validateSymbol(
    input: ValidateTradingSymbolInput,
  ): Promise<SymbolValidationResult> {
    const symbol = normalizeTradingSymbol(input.symbol);

    const asset = await this.alpacaAssetService.getAsset(symbol);

    this.assertAssetMatchesSymbol(asset, symbol);

    const validationStatus = this.resolveValidationStatus(asset);

    const persisted = await this.prisma.tradingSymbol.upsert({
      where: {
        symbol,
      },
      create: {
        symbol,
        alpacaAssetId: this.normalizeRequiredText(asset.id, 'asset ID'),
        assetClass: this.normalizeRequiredText(asset.assetClass, 'asset class'),
        exchange: this.normalizeRequiredText(asset.exchange, 'exchange'),
        name: this.normalizeRequiredText(asset.name, 'name'),
        alpacaStatus: this.normalizeRequiredText(asset.status, 'status'),
        tradable: asset.tradable,
        fractionable: asset.fractionable,
        shortable: asset.shortable,
        easyToBorrow: asset.easyToBorrow,
        lastValidatedAt: new Date(),
      },
      update: {
        alpacaAssetId: this.normalizeRequiredText(asset.id, 'asset ID'),
        assetClass: this.normalizeRequiredText(asset.assetClass, 'asset class'),
        exchange: this.normalizeRequiredText(asset.exchange, 'exchange'),
        name: this.normalizeRequiredText(asset.name, 'name'),
        alpacaStatus: this.normalizeRequiredText(asset.status, 'status'),
        tradable: asset.tradable,
        fractionable: asset.fractionable,
        shortable: asset.shortable,
        easyToBorrow: asset.easyToBorrow,
        lastValidatedAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    return {
      symbol: mapTradingSymbolRecord(persisted),
      validationStatus,
    };
  }

  private assertAssetMatchesSymbol(
    asset: AlpacaAsset,
    requestedSymbol: string,
  ): void {
    const returnedSymbol = normalizeTradingSymbol(asset.symbol);

    if (returnedSymbol !== requestedSymbol) {
      throw new Error(
        `Alpaca returned symbol ${returnedSymbol} while validating ${requestedSymbol}`,
      );
    }
  }

  private resolveValidationStatus(asset: AlpacaAsset): SymbolValidationStatus {
    const status = this.normalizeRequiredText(
      asset.status,
      'status',
    ).toLowerCase();

    if (status !== 'active') {
      return 'INACTIVE';
    }

    if (!asset.tradable) {
      return 'NOT_TRADABLE';
    }

    return 'VALID';
  }

  private normalizeRequiredText(value: string, field: string): string {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error(`Invalid Alpaca asset ${field} during symbol validation`);
    }

    return normalized;
  }
}
