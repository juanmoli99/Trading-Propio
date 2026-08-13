import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { SymbolTemporaryBlockExpirationService } from '../src/watchlist/symbol-temporary-block-expiration.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function expectReject(
  name: string,
  action: () => Promise<unknown>,
): Promise<void> {
  let rejected = false;

  try {
    await action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 210 verification');
  }

  const configService = {
    get<T>(key: string): T | undefined {
      if (key === 'database.url') {
        return databaseUrl as T;
      }

      return undefined;
    },
  } as unknown as ConfigService;

  const prisma = new PrismaService(configService);

  await prisma.$connect();

  const service = new SymbolTemporaryBlockExpirationService(prisma);

  const suffix = `${Date.now()}`.slice(-7);

  const expiredOne = `P210A${suffix}`;
  const expiredTwo = `P210B${suffix}`;
  const boundary = `P210C${suffix}`;
  const active = `P210D${suffix}`;
  const singleExpired = `P210E${suffix}`;
  const singleActive = `P210F${suffix}`;
  const missing = `P210G${suffix}`;

  const symbols = [
    expiredOne,
    expiredTwo,
    boundary,
    active,
    singleExpired,
    singleActive,
    missing,
  ];

  const asOf = new Date('2030-01-01T12:00:00.000Z');

  try {
    await prisma.symbolTemporaryBlock.createMany({
      data: [
        {
          symbol: expiredOne,
          reason: 'expired one',
          blockedAt: new Date(asOf.getTime() - 120000),
          expiresAt: new Date(asOf.getTime() - 60000),
        },
        {
          symbol: expiredTwo,
          reason: 'expired two',
          blockedAt: new Date(asOf.getTime() - 180000),
          expiresAt: new Date(asOf.getTime() - 1),
        },
        {
          symbol: boundary,
          reason: 'boundary',
          blockedAt: new Date(asOf.getTime() - 60000),
          expiresAt: new Date(asOf.getTime()),
        },
        {
          symbol: active,
          reason: 'active',
          blockedAt: new Date(asOf.getTime() - 60000),
          expiresAt: new Date(asOf.getTime() + 60000),
        },
        {
          symbol: singleExpired,
          reason: 'single expired',
          blockedAt: new Date(asOf.getTime() - 120000),
          expiresAt: new Date(asOf.getTime() - 30000),
        },
        {
          symbol: singleActive,
          reason: 'single active',
          blockedAt: new Date(asOf.getTime() - 30000),
          expiresAt: new Date(asOf.getTime() + 30000),
        },
      ],
    });

    const inputTimestamp = asOf.getTime();

    const result = await service.removeExpired(asOf);

    check('AS_OF_PRESERVED', result.asOf.getTime() === inputTimestamp);

    check('AS_OF_DEFENSIVELY_COPIED', result.asOf !== asOf);

    check('GLOBAL_REMOVED_COUNT_CORRECT', result.removedCount === 4);

    check(
      'GLOBAL_REMOVED_SYMBOLS_CORRECT',
      result.removedSymbols.length === 4 &&
        result.removedSymbols.includes(expiredOne) &&
        result.removedSymbols.includes(expiredTwo) &&
        result.removedSymbols.includes(boundary) &&
        result.removedSymbols.includes(singleExpired),
    );

    check(
      'GLOBAL_REMOVED_SYMBOLS_SORTED',
      [...result.removedSymbols].join(',') ===
        [...result.removedSymbols].sort().join(','),
    );

    const expiredRemaining = await prisma.symbolTemporaryBlock.count({
      where: {
        symbol: {
          in: [expiredOne, expiredTwo, boundary, singleExpired],
        },
      },
    });

    check('EXPIRED_BLOCKS_REMOVED', expiredRemaining === 0);

    const activePersisted = await prisma.symbolTemporaryBlock.findUnique({
      where: {
        symbol: active,
      },
    });

    check('ACTIVE_BLOCK_PRESERVED', activePersisted !== null);

    const singleActivePersisted = await prisma.symbolTemporaryBlock.findUnique({
      where: {
        symbol: singleActive,
      },
    });

    check('SECOND_ACTIVE_BLOCK_PRESERVED', singleActivePersisted !== null);

    check(
      'BOUNDARY_EXPIRATION_REMOVED',
      !result.removedSymbols.includes(active) &&
        result.removedSymbols.includes(boundary),
    );

    const secondGlobal = await service.removeExpired(new Date(asOf));

    check(
      'GLOBAL_CLEANUP_IDEMPOTENT',
      secondGlobal.removedCount === 0 &&
        secondGlobal.removedSymbols.length === 0,
    );

    const futureForActive = new Date(asOf.getTime() + 120000);

    const singleRemoved = await service.removeExpiredForSymbol(
      `  ${active.toLowerCase()}  `,
      futureForActive,
    );

    check('SINGLE_SYMBOL_NORMALIZED_AND_REMOVED', singleRemoved === true);

    const activeAfterSingleCleanup =
      await prisma.symbolTemporaryBlock.findUnique({
        where: {
          symbol: active,
        },
      });

    check(
      'SINGLE_EXPIRED_BLOCK_NOT_PERSISTED',
      activeAfterSingleCleanup === null,
    );

    const repeatedSingle = await service.removeExpiredForSymbol(
      active,
      futureForActive,
    );

    check('SINGLE_CLEANUP_IDEMPOTENT', repeatedSingle === false);

    const activeNotRemoved = await service.removeExpiredForSymbol(
      singleActive.toLowerCase(),
      asOf,
    );

    check('SINGLE_ACTIVE_BLOCK_NOT_REMOVED', activeNotRemoved === false);

    const stillActive = await prisma.symbolTemporaryBlock.findUnique({
      where: {
        symbol: singleActive,
      },
    });

    check('SINGLE_ACTIVE_BLOCK_STILL_PERSISTED', stillActive !== null);

    const missingRemoved = await service.removeExpiredForSymbol(missing, asOf);

    check('MISSING_SYMBOL_RETURNS_FALSE', missingRemoved === false);

    for (const invalidSymbol of ['', '   ', 'A'.repeat(33)]) {
      await expectReject(
        `INVALID_SYMBOL_REJECTED_${JSON.stringify(invalidSymbol)}`,
        () => service.removeExpiredForSymbol(invalidSymbol, asOf),
      );
    }

    await expectReject('INVALID_GLOBAL_AS_OF_REJECTED', () =>
      service.removeExpired(new Date(Number.NaN)),
    );

    await expectReject('INVALID_SINGLE_AS_OF_REJECTED', () =>
      service.removeExpiredForSymbol(singleActive, new Date(Number.NaN)),
    );

    const beforeInvalidChecks = await prisma.symbolTemporaryBlock.count({
      where: {
        symbol: singleActive,
      },
    });

    check(
      'INVALID_INPUTS_DO_NOT_REMOVE_ACTIVE_BLOCK',
      beforeInvalidChecks === 1,
    );

    console.log('PUNTO 210 VERIFICADO CORRECTAMENTE.');
  } finally {
    await prisma.symbolTemporaryBlock.deleteMany({
      where: {
        symbol: {
          in: symbols,
        },
      },
    });

    const remaining = await prisma.symbolTemporaryBlock.count({
      where: {
        symbol: {
          in: symbols,
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
