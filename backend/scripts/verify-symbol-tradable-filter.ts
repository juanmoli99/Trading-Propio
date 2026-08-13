import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { SymbolTradableFilterService } from '../src/watchlist/symbol-tradable-filter.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 201 verification');
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

  const service = new SymbolTradableFilterService(prisma);

  const prefix = `P201${Date.now()}`;
  const tradableSymbol = `${prefix}A`;
  const nonTradableSymbol = `${prefix}B`;
  const unknownSymbol = `${prefix}C`;
  const missingSymbol = `${prefix}D`;

  const createdIds: string[] = [];

  try {
    const tradable = await prisma.tradingSymbol.create({
      data: {
        symbol: tradableSymbol,
        tradable: true,
      },
    });

    createdIds.push(tradable.id);

    const nonTradable = await prisma.tradingSymbol.create({
      data: {
        symbol: nonTradableSymbol,
        tradable: false,
      },
    });

    createdIds.push(nonTradable.id);

    const unknown = await prisma.tradingSymbol.create({
      data: {
        symbol: unknownSymbol,
        tradable: null,
      },
    });

    createdIds.push(unknown.id);

    const allowedResult = await service.evaluate(
      `  ${tradableSymbol.toLowerCase()}  `,
    );

    check('SYMBOL_NORMALIZED', allowedResult.symbol === tradableSymbol);

    check('TRADABLE_SYMBOL_ALLOWED', allowedResult.allowed === true);

    check('TRADABLE_STATUS_CORRECT', allowedResult.status === 'ALLOWED');

    check('TRADABLE_VALUE_PRESERVED', allowedResult.tradable === true);

    check('TRADABLE_REASON_PRESENT', allowedResult.reason.length > 0);

    await service.assertTradable(tradableSymbol.toLowerCase());

    check('ASSERT_TRADABLE_PASSES', true);

    const blockedResult = await service.evaluate(
      nonTradableSymbol.toLowerCase(),
    );

    check('NON_TRADABLE_SYMBOL_BLOCKED', blockedResult.allowed === false);

    check(
      'NON_TRADABLE_STATUS_CORRECT',
      blockedResult.status === 'NOT_TRADABLE',
    );

    check('NON_TRADABLE_VALUE_PRESERVED', blockedResult.tradable === false);

    check('NON_TRADABLE_REASON_PRESENT', blockedResult.reason.length > 0);

    let nonTradableRejected = false;

    try {
      await service.assertTradable(nonTradableSymbol);
    } catch {
      nonTradableRejected = true;
    }

    check('ASSERT_TRADABLE_REJECTS_NON_TRADABLE', nonTradableRejected);

    const unknownResult = await service.evaluate(unknownSymbol);

    check('UNKNOWN_STATE_BLOCKED', unknownResult.allowed === false);

    check(
      'UNKNOWN_STATE_STATUS_CORRECT',
      unknownResult.status === 'UNKNOWN_TRADABLE_STATE',
    );

    check('UNKNOWN_STATE_VALUE_NULL', unknownResult.tradable === null);

    check('UNKNOWN_STATE_FAIL_SAFE', !unknownResult.allowed);

    let unknownRejected = false;

    try {
      await service.assertTradable(unknownSymbol);
    } catch {
      unknownRejected = true;
    }

    check('ASSERT_TRADABLE_REJECTS_UNKNOWN_STATE', unknownRejected);

    const missingResult = await service.evaluate(missingSymbol.toLowerCase());

    check('MISSING_SYMBOL_BLOCKED', missingResult.allowed === false);

    check(
      'MISSING_SYMBOL_STATUS_CORRECT',
      missingResult.status === 'SYMBOL_NOT_FOUND',
    );

    check('MISSING_SYMBOL_TRADABLE_NULL', missingResult.tradable === null);

    check('MISSING_SYMBOL_FAIL_SAFE', !missingResult.allowed);

    let missingRejected = false;

    try {
      await service.assertTradable(missingSymbol);
    } catch {
      missingRejected = true;
    }

    check('ASSERT_TRADABLE_REJECTS_MISSING_SYMBOL', missingRejected);

    for (const invalid of ['', '   ', 'A'.repeat(33)]) {
      let rejected = false;

      try {
        await service.evaluate(invalid);
      } catch {
        rejected = true;
      }

      check(`INVALID_SYMBOL_REJECTED_${JSON.stringify(invalid)}`, rejected);
    }

    const repeatedResult = await service.evaluate(tradableSymbol);

    check(
      'REPEATED_EVALUATION_DETERMINISTIC',
      repeatedResult.symbol === allowedResult.symbol &&
        repeatedResult.allowed === allowedResult.allowed &&
        repeatedResult.status === allowedResult.status &&
        repeatedResult.tradable === allowedResult.tradable &&
        repeatedResult.reason === allowedResult.reason,
    );

    console.log('PUNTO 201 VERIFICADO CORRECTAMENTE.');
  } finally {
    if (createdIds.length > 0) {
      await prisma.tradingSymbol.deleteMany({
        where: {
          id: {
            in: createdIds,
          },
        },
      });
    }

    const remaining = await prisma.tradingSymbol.count({
      where: {
        id: {
          in: createdIds,
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
