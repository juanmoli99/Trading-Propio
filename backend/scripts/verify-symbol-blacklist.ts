import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { SymbolBlacklistService } from '../src/watchlist/symbol-blacklist.service';

function assert(condition: boolean, name: string): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for point 200 verification');
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

  const service = new SymbolBlacklistService(prisma);

  const testSymbols = ['ZZZZTEST200A', 'ZZZZTEST200B', 'ZZZZTEST200C'];

  try {
    await prisma.$connect();

    await prisma.symbolBlacklistEntry.deleteMany({
      where: {
        symbol: {
          in: testSymbols,
        },
      },
    });

    const initialEvaluation = await service.evaluate('  zzzztest200a  ');

    assert(initialEvaluation.symbol === 'ZZZZTEST200A', 'SYMBOL_NORMALIZED');

    assert(initialEvaluation.blocked === false, 'ABSENT_SYMBOL_NOT_BLOCKED');

    assert(initialEvaluation.reason === null, 'ABSENT_SYMBOL_REASON_NULL');

    await service.assertNotBlocked('ZZZZTEST200A');

    assert(true, 'ASSERT_NOT_BLOCKED_PASSES_FOR_ABSENT_SYMBOL');

    const added = await service.add(
      '  zzzztest200a  ',
      '  Instrumento bloqueado para prueba  ',
    );

    assert(added.symbol === 'ZZZZTEST200A', 'ADD_SYMBOL_NORMALIZED');

    assert(
      added.reason === 'Instrumento bloqueado para prueba',
      'ADD_REASON_NORMALIZED',
    );

    assert(added.id.trim().length > 0, 'ADD_ID_VALID');

    assert(Number.isFinite(added.createdAt.getTime()), 'ADD_CREATED_AT_VALID');

    assert(Number.isFinite(added.updatedAt.getTime()), 'ADD_UPDATED_AT_VALID');

    const persisted = await prisma.symbolBlacklistEntry.findUnique({
      where: {
        symbol: 'ZZZZTEST200A',
      },
    });

    assert(persisted !== null, 'ENTRY_PERSISTED');

    assert(
      persisted?.reason === 'Instrumento bloqueado para prueba',
      'PERSISTED_REASON_CORRECT',
    );

    const duplicate = await service.add(
      'ZZZZTEST200A',
      'Instrumento bloqueado para prueba',
    );

    assert(duplicate.id === added.id, 'SAME_REASON_ADD_IDEMPOTENT');

    const duplicateCount = await prisma.symbolBlacklistEntry.count({
      where: {
        symbol: 'ZZZZTEST200A',
      },
    });

    assert(duplicateCount === 1, 'DUPLICATE_NOT_CREATED');

    const updated = await service.add('ZZZZTEST200A', '  Motivo actualizado  ');

    assert(updated.id === added.id, 'REASON_UPDATE_REUSES_ENTRY');

    assert(updated.reason === 'Motivo actualizado', 'REASON_UPDATED');

    const afterUpdateCount = await prisma.symbolBlacklistEntry.count({
      where: {
        symbol: 'ZZZZTEST200A',
      },
    });

    assert(afterUpdateCount === 1, 'REASON_UPDATE_DOES_NOT_DUPLICATE');

    const blockedEvaluation = await service.evaluate('zzzztest200a');

    assert(blockedEvaluation.blocked === true, 'BLACKLISTED_SYMBOL_BLOCKED');

    assert(
      blockedEvaluation.reason === 'Motivo actualizado',
      'BLACKLIST_REASON_RETURNED',
    );

    let blockedRejected = false;

    try {
      await service.assertNotBlocked('ZZZZTEST200A');
    } catch (error: unknown) {
      blockedRejected =
        error instanceof Error &&
        error.message ===
          'Symbol ZZZZTEST200A is blacklisted: Motivo actualizado';
    }

    assert(blockedRejected, 'ASSERT_NOT_BLOCKED_REJECTS_BLACKLISTED_SYMBOL');

    const withoutReason = await service.add('ZZZZTEST200B');

    assert(withoutReason.reason === null, 'NULL_REASON_ALLOWED');

    const withoutReasonEvaluation = await service.evaluate('ZZZZTEST200B');

    assert(
      withoutReasonEvaluation.blocked === true,
      'NO_REASON_ENTRY_STILL_BLOCKED',
    );

    assert(
      withoutReasonEvaluation.reason === null,
      'NO_REASON_EVALUATION_NULL',
    );

    let noReasonRejected = false;

    try {
      await service.assertNotBlocked('ZZZZTEST200B');
    } catch (error: unknown) {
      noReasonRejected =
        error instanceof Error &&
        error.message === 'Symbol ZZZZTEST200B is blacklisted';
    }

    assert(noReasonRejected, 'ASSERT_BLOCK_WITHOUT_REASON_CORRECT');

    await service.add('ZZZZTEST200C', 'Third');

    const list = await service.list();

    const testEntries = list.filter((entry) =>
      testSymbols.includes(entry.symbol),
    );

    assert(testEntries.length === 3, 'LIST_RETURNS_THREE_TEST_ENTRIES');

    assert(
      testEntries[0]?.symbol === 'ZZZZTEST200A' &&
        testEntries[1]?.symbol === 'ZZZZTEST200B' &&
        testEntries[2]?.symbol === 'ZZZZTEST200C',
      'LIST_SORTED_BY_SYMBOL',
    );

    const removed = await service.remove('  zzzztest200a  ');

    assert(removed.id === added.id, 'REMOVE_RETURNS_CORRECT_ENTRY');

    assert(removed.symbol === 'ZZZZTEST200A', 'REMOVE_SYMBOL_NORMALIZED');

    const afterRemoval = await service.evaluate('ZZZZTEST200A');

    assert(afterRemoval.blocked === false, 'REMOVED_SYMBOL_NOT_BLOCKED');

    const removedPersisted = await prisma.symbolBlacklistEntry.findUnique({
      where: {
        symbol: 'ZZZZTEST200A',
      },
    });

    assert(removedPersisted === null, 'REMOVED_SYMBOL_NOT_PERSISTED');

    let missingRejected = false;

    try {
      await service.remove('ZZZZTEST200A');
    } catch (error: unknown) {
      missingRejected =
        error instanceof Error &&
        error.message === 'Blacklist symbol ZZZZTEST200A does not exist';
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

    const invalidReasons = ['', '   ', 'A'.repeat(501)];

    for (const reason of invalidReasons) {
      let rejected = false;

      try {
        await service.add('ZZZZTEST200A', reason);
      } catch {
        rejected = true;
      }

      assert(
        rejected,
        `INVALID_REASON_REJECTED_${JSON.stringify(
          reason.length > 20 ? `length:${reason.length}` : reason,
        )}`,
      );
    }

    console.log('PUNTO 200 VERIFICADO CORRECTAMENTE.');
  } finally {
    await prisma.symbolBlacklistEntry.deleteMany({
      where: {
        symbol: {
          in: testSymbols,
        },
      },
    });

    const remaining = await prisma.symbolBlacklistEntry.count({
      where: {
        symbol: {
          in: testSymbols,
        },
      },
    });

    console.log(`VERIFICATION_DATA_CLEANED: ${remaining === 0}`);

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
