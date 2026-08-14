import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { SymbolTemporaryBlockService } from '../src/watchlist/symbol-temporary-block.service';

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
    throw new Error('DATABASE_URL is required for point 208 verification');
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

  const service = new SymbolTemporaryBlockService(prisma);

  const suffix = `${Date.now()}`.slice(-7);
  const symbol = `P208A${suffix}`;
  const expiredSymbol = `P208E${suffix}`;
  const removedSymbol = `P208R${suffix}`;
  const missingSymbol = `P208M${suffix}`;

  const verificationSymbols = [
    symbol,
    expiredSymbol,
    removedSymbol,
    missingSymbol,
  ];

  try {
    const firstExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const first = await service.block(
      `  ${symbol.toLowerCase()}  `,
      '  abnormal market behavior  ',
      firstExpiresAt,
    );

    check('BLOCK_SYMBOL_NORMALIZED', first.symbol === symbol);

    check(
      'BLOCK_REASON_NORMALIZED',
      first.reason === 'abnormal market behavior',
    );

    check('BLOCK_ID_VALID', first.id.trim().length > 0);

    check('BLOCKED_AT_VALID', Number.isFinite(first.blockedAt.getTime()));

    check(
      'EXPIRES_AT_PRESERVED',
      first.expiresAt.getTime() === firstExpiresAt.getTime(),
    );

    check('CREATED_AT_VALID', Number.isFinite(first.createdAt.getTime()));

    check('UPDATED_AT_VALID', Number.isFinite(first.updatedAt.getTime()));

    firstExpiresAt.setTime(0);

    check(
      'BLOCK_INPUT_DATE_DEFENSIVELY_HANDLED',
      first.expiresAt.getTime() !== 0,
    );

    const persisted = await prisma.symbolTemporaryBlock.findUnique({
      where: {
        symbol,
      },
    });

    check('BLOCK_PERSISTED', persisted !== null);

    check('PERSISTED_SYMBOL_NORMALIZED', persisted?.symbol === symbol);

    check(
      'PERSISTED_REASON_CORRECT',
      persisted?.reason === 'abnormal market behavior',
    );

    const evaluation = await service.evaluate(
      symbol.toLowerCase(),
      new Date(first.blockedAt.getTime() + 1),
    );

    check('EVALUATION_SYMBOL_NORMALIZED', evaluation.symbol === symbol);

    check('ACTIVE_BLOCK_DETECTED', evaluation.blocked === true);

    check(
      'ACTIVE_BLOCK_REASON_PRESERVED',
      evaluation.reason === 'abnormal market behavior',
    );

    check(
      'ACTIVE_BLOCK_TIMESTAMPS_PRESENT',
      evaluation.blockedAt !== null && evaluation.expiresAt !== null,
    );

    if (evaluation.blockedAt === null || evaluation.expiresAt === null) {
      throw new Error('Active block timestamps unexpectedly missing');
    }

    const evaluationBlockedAt = evaluation.blockedAt.getTime();

    const evaluationExpiresAt = evaluation.expiresAt.getTime();

    evaluation.blockedAt.setTime(0);
    evaluation.expiresAt.setTime(0);

    const repeatedAfterMutation = await service.evaluate(
      symbol,
      new Date(evaluationBlockedAt + 1),
    );

    check(
      'EVALUATION_DATES_DEFENSIVELY_COPIED',
      repeatedAfterMutation.blockedAt?.getTime() === evaluationBlockedAt &&
        repeatedAfterMutation.expiresAt?.getTime() === evaluationExpiresAt,
    );

    await expectReject('ASSERT_NOT_BLOCKED_REJECTS_ACTIVE_BLOCK', () =>
      service.assertNotBlocked(symbol, new Date(evaluationBlockedAt + 1)),
    );

    const secondExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const updated = await service.block(
      symbol,
      'second reason',
      secondExpiresAt,
    );

    check('SECOND_BLOCK_REUSES_ENTRY', updated.id === first.id);

    check('SECOND_BLOCK_REASON_UPDATED', updated.reason === 'second reason');

    check(
      'SECOND_BLOCK_EXPIRATION_UPDATED',
      updated.expiresAt.getTime() === secondExpiresAt.getTime(),
    );

    const duplicateCount = await prisma.symbolTemporaryBlock.count({
      where: {
        symbol,
      },
    });

    check('SECOND_BLOCK_DOES_NOT_DUPLICATE', duplicateCount === 1);

    const expiredBlock = await service.block(
      expiredSymbol,
      'temporary issue',
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const afterExpiration = new Date(expiredBlock.expiresAt.getTime() + 1);

    const expiredEvaluation = await service.evaluate(
      expiredSymbol,
      afterExpiration,
    );

    check('EXPIRED_BLOCK_NOT_BLOCKING', expiredEvaluation.blocked === false);

    check('EXPIRED_BLOCK_REASON_NULL', expiredEvaluation.reason === null);

    check(
      'EXPIRED_BLOCK_TIMESTAMPS_NULL',
      expiredEvaluation.blockedAt === null &&
        expiredEvaluation.expiresAt === null,
    );

    await service.assertNotBlocked(expiredSymbol, afterExpiration);

    check('ASSERT_NOT_BLOCKED_PASSES_AFTER_EXPIRATION', true);

    const missingEvaluation = await service.evaluate(missingSymbol);

    check('MISSING_BLOCK_NOT_BLOCKING', missingEvaluation.blocked === false);

    check('MISSING_BLOCK_REASON_NULL', missingEvaluation.reason === null);

    check(
      'MISSING_BLOCK_TIMESTAMPS_NULL',
      missingEvaluation.blockedAt === null &&
        missingEvaluation.expiresAt === null,
    );

    await service.assertNotBlocked(missingSymbol);

    check('ASSERT_NOT_BLOCKED_PASSES_MISSING_BLOCK', true);

    const removable = await service.block(
      removedSymbol,
      'manual removal test',
      new Date(Date.now() + 60 * 60 * 1000),
    );

    const removed = await service.remove(removedSymbol.toLowerCase());

    check('REMOVE_RETURNS_CORRECT_ENTRY', removed.id === removable.id);

    check('REMOVE_SYMBOL_NORMALIZED', removed.symbol === removedSymbol);

    const removedPersisted = await prisma.symbolTemporaryBlock.findUnique({
      where: {
        symbol: removedSymbol,
      },
    });

    check('REMOVED_BLOCK_NOT_PERSISTED', removedPersisted === null);

    const removedEvaluation = await service.evaluate(removedSymbol);

    check('REMOVED_SYMBOL_NOT_BLOCKED', removedEvaluation.blocked === false);

    await expectReject('MISSING_REMOVE_REJECTED', () =>
      service.remove(missingSymbol),
    );

    for (const invalidSymbol of ['', '   ', 'A'.repeat(33)]) {
      await expectReject(
        `INVALID_SYMBOL_REJECTED_${JSON.stringify(invalidSymbol)}`,
        () =>
          service.block(invalidSymbol, 'reason', new Date(Date.now() + 60000)),
      );
    }

    for (const invalidReason of ['', '   ', 'A'.repeat(501)]) {
      await expectReject(
        `INVALID_REASON_REJECTED_${JSON.stringify(
          invalidReason.length > 20
            ? `length:${invalidReason.length}`
            : invalidReason,
        )}`,
        () =>
          service.block(symbol, invalidReason, new Date(Date.now() + 60000)),
      );
    }

    await expectReject('PAST_EXPIRATION_REJECTED', () =>
      service.block(symbol, 'reason', new Date(Date.now() - 1000)),
    );

    await expectReject('INVALID_EXPIRATION_REJECTED', () =>
      service.block(symbol, 'reason', new Date(Number.NaN)),
    );

    await expectReject('INVALID_AS_OF_REJECTED', () =>
      service.evaluate(symbol, new Date(Number.NaN)),
    );

    const deterministicAsOf = new Date(updated.blockedAt.getTime() + 1);

    const deterministicOne = await service.evaluate(symbol, deterministicAsOf);

    const deterministicTwo = await service.evaluate(
      symbol,
      new Date(deterministicAsOf),
    );

    check(
      'REPEATED_EVALUATION_DETERMINISTIC',
      deterministicOne.symbol === deterministicTwo.symbol &&
        deterministicOne.blocked === deterministicTwo.blocked &&
        deterministicOne.reason === deterministicTwo.reason &&
        deterministicOne.blockedAt?.getTime() ===
          deterministicTwo.blockedAt?.getTime() &&
        deterministicOne.expiresAt?.getTime() ===
          deterministicTwo.expiresAt?.getTime(),
    );

    console.log('PUNTO 208 VERIFICADO CORRECTAMENTE.');
  } finally {
    await prisma.symbolTemporaryBlock.deleteMany({
      where: {
        symbol: {
          in: verificationSymbols,
        },
      },
    });

    const remaining = await prisma.symbolTemporaryBlock.count({
      where: {
        symbol: {
          in: verificationSymbols,
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

