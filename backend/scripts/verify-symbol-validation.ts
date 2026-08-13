import 'dotenv/config';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import type { AlpacaAsset } from '../src/alpaca/alpaca-asset.types';
import type { AlpacaAssetService } from '../src/alpaca/alpaca-asset.service';
import { PrismaService } from '../src/database/prisma.service';
import { SymbolValidationService } from '../src/symbols/symbol-validation.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function createAsset(overrides: Partial<AlpacaAsset> = {}): AlpacaAsset {
  return {
    id: 'asset-aapl',
    assetClass: 'us_equity',
    exchange: 'NASDAQ',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    status: 'active',
    tradable: true,
    fractionable: true,
    shortable: true,
    easyToBorrow: true,
    ...overrides,
  };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 193 verification');
  }

  const configService = {
    get<T>(key: string): T | undefined {
      if (key === 'database.url') {
        return databaseUrl as T;
      }

      return undefined;
    },
  } as ConfigService;

  const prisma = new PrismaService(configService);

  await prisma.$connect();

  const symbolsToClean = [
    'P193AAPL',
    'P193INACTIVE',
    'P193NOTRADABLE',
    'P193MISMATCH',
  ];

  try {
    await prisma.tradingSymbol.deleteMany({
      where: {
        symbol: {
          in: symbolsToClean,
        },
      },
    });

    let requestedSymbol: string | null = null;

    const validAsset = createAsset({
      id: 'asset-p193-aapl',
      symbol: 'P193AAPL',
      name: 'Point 193 Valid Asset',
    });

    const alpacaAssetService = {
      async getAsset(symbol: string): Promise<AlpacaAsset> {
        requestedSymbol = symbol;
        return validAsset;
      },
    } as unknown as AlpacaAssetService;

    const service = new SymbolValidationService(prisma, alpacaAssetService);

    const first = await service.validateSymbol({
      symbol: '  p193aapl  ',
    });

    check('SYMBOL_NORMALIZED', first.symbol.symbol === 'P193AAPL');

    check(
      'ALPACA_QUERY_USES_NORMALIZED_SYMBOL',
      requestedSymbol === 'P193AAPL',
    );

    check('VALID_STATUS_CORRECT', first.validationStatus === 'VALID');

    check(
      'ALPACA_ASSET_ID_PERSISTED',
      first.symbol.alpacaAssetId === 'asset-p193-aapl',
    );

    check('ASSET_CLASS_PERSISTED', first.symbol.assetClass === 'us_equity');

    check('EXCHANGE_PERSISTED', first.symbol.exchange === 'NASDAQ');

    check('NAME_PERSISTED', first.symbol.name === 'Point 193 Valid Asset');

    check('ALPACA_STATUS_PERSISTED', first.symbol.alpacaStatus === 'active');

    check('TRADABLE_PERSISTED', first.symbol.tradable === true);

    check('FRACTIONABLE_PERSISTED', first.symbol.fractionable === true);

    check('SHORTABLE_PERSISTED', first.symbol.shortable === true);

    check('EASY_TO_BORROW_PERSISTED', first.symbol.easyToBorrow === true);

    check(
      'LAST_VALIDATED_AT_SET',
      first.symbol.lastValidatedAt instanceof Date &&
        Number.isFinite(first.symbol.lastValidatedAt.getTime()),
    );

    check('INITIAL_VERSION_ZERO', first.symbol.version === 0);

    const persistedFirst = await prisma.tradingSymbol.findUnique({
      where: {
        symbol: 'P193AAPL',
      },
    });

    check('VALID_SYMBOL_PERSISTED', persistedFirst !== null);

    check(
      'PERSISTED_METADATA_CORRECT',
      persistedFirst?.alpacaAssetId === 'asset-p193-aapl' &&
        persistedFirst.assetClass === 'us_equity' &&
        persistedFirst.exchange === 'NASDAQ' &&
        persistedFirst.name === 'Point 193 Valid Asset',
    );

    const firstValidatedAt = first.symbol.lastValidatedAt;

    await new Promise((resolve) => setTimeout(resolve, 10));

    const updatedAsset = createAsset({
      id: 'asset-p193-aapl',
      symbol: 'P193AAPL',
      name: 'Point 193 Updated Asset',
      fractionable: false,
      shortable: false,
      easyToBorrow: false,
    });

    const updateAlpacaService = {
      async getAsset(): Promise<AlpacaAsset> {
        return updatedAsset;
      },
    } as unknown as AlpacaAssetService;

    const updateService = new SymbolValidationService(
      prisma,
      updateAlpacaService,
    );

    const second = await updateService.validateSymbol({
      symbol: 'P193AAPL',
    });

    check(
      'SECOND_VALIDATION_REUSES_RECORD',
      second.symbol.id === first.symbol.id,
    );

    check('VERSION_INCREMENTED', second.symbol.version === 1);

    check(
      'METADATA_REFRESHED',
      second.symbol.name === 'Point 193 Updated Asset',
    );

    check(
      'CAPABILITIES_REFRESHED',
      second.symbol.fractionable === false &&
        second.symbol.shortable === false &&
        second.symbol.easyToBorrow === false,
    );

    check(
      'LAST_VALIDATED_AT_REFRESHED',
      firstValidatedAt !== null &&
        second.symbol.lastValidatedAt !== null &&
        second.symbol.lastValidatedAt.getTime() > firstValidatedAt.getTime(),
    );

    const inactiveService = new SymbolValidationService(prisma, {
      async getAsset(symbol: string): Promise<AlpacaAsset> {
        return createAsset({
          id: 'asset-p193-inactive',
          symbol,
          status: 'inactive',
          tradable: true,
        });
      },
    } as unknown as AlpacaAssetService);

    const inactive = await inactiveService.validateSymbol({
      symbol: 'P193INACTIVE',
    });

    check('INACTIVE_STATUS_CORRECT', inactive.validationStatus === 'INACTIVE');

    check(
      'INACTIVE_ASSET_PERSISTED',
      inactive.symbol.alpacaStatus === 'inactive',
    );

    const notTradableService = new SymbolValidationService(prisma, {
      async getAsset(symbol: string): Promise<AlpacaAsset> {
        return createAsset({
          id: 'asset-p193-not-tradable',
          symbol,
          status: 'active',
          tradable: false,
        });
      },
    } as unknown as AlpacaAssetService);

    const notTradable = await notTradableService.validateSymbol({
      symbol: 'P193NOTRADABLE',
    });

    check(
      'NOT_TRADABLE_STATUS_CORRECT',
      notTradable.validationStatus === 'NOT_TRADABLE',
    );

    check(
      'NOT_TRADABLE_CAPABILITY_PERSISTED',
      notTradable.symbol.tradable === false,
    );

    const mismatchService = new SymbolValidationService(prisma, {
      async getAsset(): Promise<AlpacaAsset> {
        return createAsset({
          id: 'asset-p193-mismatch',
          symbol: 'OTHER',
        });
      },
    } as unknown as AlpacaAssetService);

    await assert.rejects(
      mismatchService.validateSymbol({
        symbol: 'P193MISMATCH',
      }),
      /returned symbol/i,
    );

    check('MISMATCHED_ALPACA_SYMBOL_REJECTED', true);

    const mismatchedPersisted = await prisma.tradingSymbol.findUnique({
      where: {
        symbol: 'P193MISMATCH',
      },
    });

    check('MISMATCH_NOT_PERSISTED', mismatchedPersisted === null);

    await assert.rejects(
      service.validateSymbol({
        symbol: '   ',
      }),
    );

    check('EMPTY_SYMBOL_REJECTED', true);

    await assert.rejects(
      service.validateSymbol({
        symbol: 'A'.repeat(33),
      }),
    );

    check('TOO_LONG_SYMBOL_REJECTED', true);

    const emptyMetadataService = new SymbolValidationService(prisma, {
      async getAsset(symbol: string): Promise<AlpacaAsset> {
        return createAsset({
          symbol,
          id: '   ',
        });
      },
    } as unknown as AlpacaAssetService);

    await assert.rejects(
      emptyMetadataService.validateSymbol({
        symbol: 'P193MISMATCH',
      }),
      /asset ID/i,
    );

    check('EMPTY_ALPACA_METADATA_REJECTED', true);

    const invalidStatusService = new SymbolValidationService(prisma, {
      async getAsset(symbol: string): Promise<AlpacaAsset> {
        return createAsset({
          symbol,
          status: '   ',
        });
      },
    } as unknown as AlpacaAssetService);

    await assert.rejects(
      invalidStatusService.validateSymbol({
        symbol: 'P193MISMATCH',
      }),
      /status/i,
    );

    check('EMPTY_ALPACA_STATUS_REJECTED', true);

    console.log('PUNTO 193 VERIFICADO CORRECTAMENTE.');
  } finally {
    await prisma.tradingSymbol.deleteMany({
      where: {
        symbol: {
          in: symbolsToClean,
        },
      },
    });

    const remaining = await prisma.tradingSymbol.count({
      where: {
        symbol: {
          in: symbolsToClean,
        },
      },
    });

    check('VERIFICATION_DATA_CLEANED', remaining === 0);

    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
