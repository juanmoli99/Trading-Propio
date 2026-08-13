import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import {
  createTradingSymbolInput,
  mapTradingSymbolRecord,
  normalizeTradingSymbol,
} from '../src/symbols/symbol-model';
import type { TradingSymbolPersistenceRecord } from '../src/symbols/symbol.types';
import { PrismaService } from '../src/database/prisma.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectReject(name: string, action: () => unknown): void {
  let rejected = false;

  try {
    action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

async function main(): Promise<void> {
  const normalized = normalizeTradingSymbol('  aapl  ');

  check('SYMBOL_NORMALIZED', normalized === 'AAPL');

  const createInput = createTradingSymbolInput({
    symbol: ' msft ',
  });

  check('CREATE_INPUT_NORMALIZED', createInput.symbol === 'MSFT');

  expectReject('EMPTY_SYMBOL_REJECTED', () => normalizeTradingSymbol('   '));

  expectReject('WHITESPACE_SYMBOL_REJECTED', () =>
    normalizeTradingSymbol('BAD SYMBOL'),
  );

  expectReject('TOO_LONG_SYMBOL_REJECTED', () =>
    normalizeTradingSymbol('A'.repeat(33)),
  );

  const createdAt = new Date('2026-08-13T10:00:00.000Z');

  const updatedAt = new Date('2026-08-13T11:00:00.000Z');

  const validatedAt = new Date('2026-08-13T10:30:00.000Z');

  const record: TradingSymbolPersistenceRecord = {
    id: 'symbol-1',
    symbol: ' aapl ',
    status: 'ACTIVE',

    alpacaAssetId: ' asset-123 ',
    assetClass: ' us_equity ',
    exchange: ' NASDAQ ',
    name: ' Apple Inc. ',
    alpacaStatus: ' active ',

    tradable: true,
    fractionable: true,
    shortable: true,
    easyToBorrow: true,

    lastValidatedAt: validatedAt,
    version: 3,
    createdAt,
    updatedAt,
  };

  const mapped = mapTradingSymbolRecord(record);

  check('RECORD_ID_PRESERVED', mapped.id === 'symbol-1');

  check('RECORD_SYMBOL_NORMALIZED', mapped.symbol === 'AAPL');

  check('STATUS_PRESERVED', mapped.status === 'ACTIVE');

  check('ALPACA_ASSET_ID_NORMALIZED', mapped.alpacaAssetId === 'asset-123');

  check('ASSET_CLASS_NORMALIZED', mapped.assetClass === 'us_equity');

  check('EXCHANGE_NORMALIZED', mapped.exchange === 'NASDAQ');

  check('NAME_NORMALIZED', mapped.name === 'Apple Inc.');

  check('ALPACA_STATUS_NORMALIZED', mapped.alpacaStatus === 'active');

  check('TRADABLE_PRESERVED', mapped.tradable === true);

  check('FRACTIONABLE_PRESERVED', mapped.fractionable === true);

  check('SHORTABLE_PRESERVED', mapped.shortable === true);

  check('EASY_TO_BORROW_PRESERVED', mapped.easyToBorrow === true);

  check('VERSION_PRESERVED', mapped.version === 3);

  check(
    'CREATED_AT_PRESERVED',
    mapped.createdAt.getTime() === createdAt.getTime(),
  );

  check(
    'UPDATED_AT_PRESERVED',
    mapped.updatedAt.getTime() === updatedAt.getTime(),
  );

  check(
    'LAST_VALIDATED_AT_PRESERVED',
    mapped.lastValidatedAt?.getTime() === validatedAt.getTime(),
  );

  check('CREATED_AT_DEFENSIVELY_COPIED', mapped.createdAt !== createdAt);

  check('UPDATED_AT_DEFENSIVELY_COPIED', mapped.updatedAt !== updatedAt);

  check(
    'LAST_VALIDATED_AT_DEFENSIVELY_COPIED',
    mapped.lastValidatedAt !== validatedAt,
  );

  const nullMetadata = mapTradingSymbolRecord({
    id: 'symbol-2',
    symbol: 'MSFT',
    status: 'INACTIVE',

    alpacaAssetId: null,
    assetClass: null,
    exchange: null,
    name: null,
    alpacaStatus: null,

    tradable: null,
    fractionable: null,
    shortable: null,
    easyToBorrow: null,

    lastValidatedAt: null,
    version: 0,
    createdAt,
    updatedAt,
  });

  check(
    'NULL_ALPACA_METADATA_ALLOWED',
    nullMetadata.alpacaAssetId === null &&
      nullMetadata.assetClass === null &&
      nullMetadata.exchange === null &&
      nullMetadata.name === null &&
      nullMetadata.alpacaStatus === null,
  );

  check(
    'NULL_CAPABILITIES_ALLOWED',
    nullMetadata.tradable === null &&
      nullMetadata.fractionable === null &&
      nullMetadata.shortable === null &&
      nullMetadata.easyToBorrow === null,
  );

  check('NULL_LAST_VALIDATED_ALLOWED', nullMetadata.lastValidatedAt === null);

  expectReject('EMPTY_RECORD_ID_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      id: '   ',
    }),
  );

  expectReject('NEGATIVE_VERSION_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      version: -1,
    }),
  );

  expectReject('NON_INTEGER_VERSION_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      version: 1.5,
    }),
  );

  expectReject('INVALID_CREATED_AT_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      createdAt: new Date(Number.NaN),
    }),
  );

  expectReject('INVALID_UPDATED_AT_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      updatedAt: new Date(Number.NaN),
    }),
  );

  expectReject('INVALID_LAST_VALIDATED_AT_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      lastValidatedAt: new Date(Number.NaN),
    }),
  );

  expectReject('UPDATED_BEFORE_CREATED_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
      updatedAt: new Date('2026-08-13T11:00:00.000Z'),
    }),
  );

  expectReject('EMPTY_ALPACA_ASSET_ID_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      alpacaAssetId: '   ',
    }),
  );

  expectReject('EMPTY_ASSET_CLASS_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      assetClass: '   ',
    }),
  );

  expectReject('EMPTY_EXCHANGE_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      exchange: '   ',
    }),
  );

  expectReject('EMPTY_NAME_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      name: '   ',
    }),
  );

  expectReject('EMPTY_ALPACA_STATUS_REJECTED', () =>
    mapTradingSymbolRecord({
      ...record,
      alpacaStatus: '   ',
    }),
  );

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 192 verification');
  }

  const prisma = new PrismaService(
    new ConfigService({
      database: {
        url: databaseUrl,
      },
    }),
  );

  await prisma.$connect();

  const testSymbol = `ZZZ${Date.now()}`;

  const persisted = await prisma.tradingSymbol.create({
    data: {
      symbol: testSymbol,
    },
  });

  check(
    'PRISMA_TRADING_SYMBOL_MODEL_EXISTS',
    typeof persisted.id === 'string' && persisted.id.length > 0,
  );

  check('PRISMA_DEFAULT_STATUS_ACTIVE', persisted.status === 'ACTIVE');

  check('PRISMA_DEFAULT_VERSION_ZERO', persisted.version === 0);

  check(
    'PRISMA_ALPACA_METADATA_NULL_BEFORE_VALIDATION',
    persisted.alpacaAssetId === null &&
      persisted.assetClass === null &&
      persisted.exchange === null &&
      persisted.name === null &&
      persisted.alpacaStatus === null &&
      persisted.lastValidatedAt === null,
  );

  let duplicateRejected = false;

  try {
    await prisma.tradingSymbol.create({
      data: {
        symbol: testSymbol,
      },
    });
  } catch {
    duplicateRejected = true;
  }

  check('PRISMA_SYMBOL_UNIQUE', duplicateRejected);

  await prisma.tradingSymbol.deleteMany({
    where: {
      symbol: testSymbol,
    },
  });

  const remaining = await prisma.tradingSymbol.count({
    where: {
      symbol: testSymbol,
    },
  });

  check('VERIFICATION_DATA_CLEANED', remaining === 0);

  await prisma.$disconnect();

  console.log('PUNTO 192 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log('PUNTO 192 VERIFICADO CORRECTAMENTE.');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
