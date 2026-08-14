import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { SymbolWhitelistService } from '../src/watchlist/symbol-whitelist.service';

function assert(condition: boolean, name: string): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 199 verification');
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

  const service = new SymbolWhitelistService(prisma);

  const testSymbols = ['AAPL', 'MSFT', 'ZZZZTEST199'];

  try {
    await prisma.$connect();

    await prisma.symbolWhitelistEntry.deleteMany({
      where: {
        symbol: {
          in: testSymbols,
        },
      },
    });

    const initialCount = await prisma.symbolWhitelistEntry.count();

    if (initialCount !== 0) {
      await prisma.symbolWhitelistEntry.deleteMany();
    }

    const emptyEvaluation = await service.evaluate('  aapl  ');

    assert(
      emptyEvaluation.symbol === 'AAPL',
      'EMPTY_WHITELIST_SYMBOL_NORMALIZED',
    );

    assert(
      emptyEvaluation.whitelistEnabled === false,
      'EMPTY_WHITELIST_DISABLED',
    );

    assert(emptyEvaluation.allowed === true, 'EMPTY_WHITELIST_ALLOWS_SYMBOL');

    await service.assertAllowed('AAPL');

    assert(true, 'EMPTY_WHITELIST_ASSERT_ALLOWED_PASSES');

    const addedAapl = await service.add('  aapl  ');

    assert(addedAapl.symbol === 'AAPL', 'ADD_SYMBOL_NORMALIZED');

    assert(addedAapl.id.trim().length > 0, 'ADD_ID_VALID');

    assert(
      Number.isFinite(addedAapl.createdAt.getTime()),
      'ADD_CREATED_AT_VALID',
    );

    assert(
      Number.isFinite(addedAapl.updatedAt.getTime()),
      'ADD_UPDATED_AT_VALID',
    );

    const persistedAapl = await prisma.symbolWhitelistEntry.findUnique({
      where: {
        symbol: 'AAPL',
      },
    });

    assert(persistedAapl !== null, 'AAPL_PERSISTED');

    const duplicateAapl = await service.add('AAPL');

    assert(duplicateAapl.id === addedAapl.id, 'DUPLICATE_ADD_IDEMPOTENT');

    const aaplCount = await prisma.symbolWhitelistEntry.count({
      where: {
        symbol: 'AAPL',
      },
    });

    assert(aaplCount === 1, 'DUPLICATE_NOT_PERSISTED');

    const addedMsft = await service.add('msft');

    assert(addedMsft.symbol === 'MSFT', 'SECOND_SYMBOL_NORMALIZED');

    const list = await service.list();

    assert(list.length === 2, 'LIST_RETURNS_TWO_ENTRIES');

    assert(
      list[0]?.symbol === 'AAPL' && list[1]?.symbol === 'MSFT',
      'LIST_SORTED_BY_SYMBOL',
    );

    const allowedEvaluation = await service.evaluate('aapl');

    assert(
      allowedEvaluation.symbol === 'AAPL',
      'ENABLED_EVALUATION_SYMBOL_NORMALIZED',
    );

    assert(
      allowedEvaluation.whitelistEnabled === true,
      'NON_EMPTY_WHITELIST_ENABLED',
    );

    assert(allowedEvaluation.allowed === true, 'WHITELISTED_SYMBOL_ALLOWED');

    const blockedEvaluation = await service.evaluate('ZZZZTEST199');

    assert(
      blockedEvaluation.whitelistEnabled === true,
      'BLOCKED_EVALUATION_WHITELIST_ENABLED',
    );

    assert(
      blockedEvaluation.allowed === false,
      'NON_WHITELISTED_SYMBOL_BLOCKED',
    );

    await service.assertAllowed('MSFT');

    assert(true, 'ASSERT_ALLOWED_PASSES_FOR_WHITELISTED_SYMBOL');

    let blockedRejected = false;

    try {
      await service.assertAllowed('ZZZZTEST199');
    } catch (error: unknown) {
      blockedRejected =
        error instanceof Error &&
        error.message === 'Symbol ZZZZTEST199 is not allowed by whitelist';
    }

    assert(blockedRejected, 'ASSERT_ALLOWED_REJECTS_NON_WHITELISTED_SYMBOL');

    const removed = await service.remove('  aapl  ');

    assert(removed.id === addedAapl.id, 'REMOVE_RETURNS_CORRECT_ENTRY');

    assert(removed.symbol === 'AAPL', 'REMOVE_SYMBOL_NORMALIZED');

    const removedPersisted = await prisma.symbolWhitelistEntry.findUnique({
      where: {
        symbol: 'AAPL',
      },
    });

    assert(removedPersisted === null, 'REMOVED_SYMBOL_NOT_PERSISTED');

    const removedEvaluation = await service.evaluate('AAPL');

    assert(
      removedEvaluation.whitelistEnabled === true,
      'WHITELIST_REMAINS_ENABLED_WITH_MSFT',
    );

    assert(removedEvaluation.allowed === false, 'REMOVED_SYMBOL_NOW_BLOCKED');

    let missingRejected = false;

    try {
      await service.remove('AAPL');
    } catch (error: unknown) {
      missingRejected =
        error instanceof Error &&
        error.message === 'Whitelist symbol AAPL does not exist';
    }

    assert(missingRejected, 'MISSING_REMOVE_REJECTED');

    const invalidSymbols = ['', '   ', 'A'.repeat(33)];

    for (const symbol of invalidSymbols) {
      let rejected = false;

      try {
        await service.add(symbol);
      } catch {
        rejected = true;
      }

      assert(rejected, `INVALID_SYMBOL_REJECTED_${JSON.stringify(symbol)}`);
    }

    await service.remove('MSFT');

    const finalEvaluation = await service.evaluate('AAPL');

    assert(
      finalEvaluation.whitelistEnabled === false,
      'WHITELIST_DISABLED_AFTER_LAST_REMOVAL',
    );

    assert(finalEvaluation.allowed === true, 'EMPTY_WHITELIST_ALLOWS_AGAIN');

    console.log('PUNTO 199 VERIFICADO CORRECTAMENTE.');
  } finally {
    await prisma.symbolWhitelistEntry.deleteMany({
      where: {
        symbol: {
          in: testSymbols,
        },
      },
    });

    console.log('VERIFICATION_DATA_CLEANED: true');

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

