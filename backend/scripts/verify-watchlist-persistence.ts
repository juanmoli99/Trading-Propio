import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/database/prisma.service';
import { WatchlistRepository } from '../src/watchlist/watchlist.repository';

function assert(condition: boolean, name: string): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for point 194.2 verification');
  }

  const configService = {
    get<T>(key: string): T | undefined {
      if (key === 'database.url') {
        return process.env.DATABASE_URL as T;
      }

      return undefined;
    },
  } as unknown as ConfigService;

  const prisma = new PrismaService(configService);

  const repository = new WatchlistRepository(prisma);

  const suffix = `${Date.now()}`;

  const symbolA = `WLA${suffix.slice(-8)}`;
  const symbolB = `WLB${suffix.slice(-8)}`;

  let tradingSymbolId: string | null = null;
  let watchlistAId: string | null = null;
  let watchlistBId: string | null = null;

  try {
    await prisma.$connect();

    const tradingSymbol = await prisma.tradingSymbol.create({
      data: {
        symbol: symbolA,
      },
    });

    tradingSymbolId = tradingSymbol.id;

    const createdA = await repository.create({
      symbol: `  ${symbolA.toLowerCase()}  `,
      tradingSymbolId,
    });

    watchlistAId = createdA.id;

    assert(createdA.symbol === symbolA, 'CREATE_SYMBOL_NORMALIZED');

    assert(
      createdA.tradingSymbolId === tradingSymbolId,
      'TRADING_SYMBOL_ASSOCIATION_PERSISTED',
    );

    assert(createdA.status === 'ACTIVE', 'DEFAULT_STATUS_ACTIVE');

    assert(createdA.version === 0, 'DEFAULT_VERSION_ZERO');

    assert(
      createdA.createdAt instanceof Date &&
        Number.isFinite(createdA.createdAt.getTime()),
      'CREATED_AT_VALID',
    );

    assert(
      createdA.updatedAt instanceof Date &&
        Number.isFinite(createdA.updatedAt.getTime()),
      'UPDATED_AT_VALID',
    );

    const persistedA = await prisma.watchlistSymbol.findUnique({
      where: {
        id: createdA.id,
      },
    });

    assert(persistedA !== null, 'ENTRY_PERSISTED');

    assert(persistedA?.symbol === symbolA, 'PERSISTED_SYMBOL_NORMALIZED');

    assert(
      persistedA?.tradingSymbolId === tradingSymbolId,
      'PERSISTED_RELATION_CORRECT',
    );

    const bySymbol = await repository.findBySymbol(
      ` ${symbolA.toLowerCase()} `,
    );

    assert(bySymbol?.id === createdA.id, 'FIND_BY_SYMBOL_WORKS');

    const byId = await repository.findById(` ${createdA.id} `);

    assert(byId?.symbol === symbolA, 'FIND_BY_ID_WORKS');

    const createdB = await repository.create({
      symbol: symbolB,
    });

    watchlistBId = createdB.id;

    assert(createdB.tradingSymbolId === null, 'NULL_TRADING_SYMBOL_ALLOWED');

    assert(createdB.status === 'ACTIVE', 'SECOND_ENTRY_DEFAULT_ACTIVE');

    assert(createdB.version === 0, 'SECOND_ENTRY_DEFAULT_VERSION_ZERO');

    const all = await repository.findAll();

    const relevant = all.filter(
      (entry) => entry.id === createdA.id || entry.id === createdB.id,
    );

    assert(relevant.length === 2, 'FIND_ALL_RETURNS_BOTH_ENTRIES');

    assert(
      relevant[0]?.symbol < relevant[1]?.symbol,
      'FIND_ALL_SORTED_BY_SYMBOL',
    );

    const updated = await repository.update(createdA.id, {
      status: 'INACTIVE',
      tradingSymbolId: null,
    });

    assert(updated.status === 'INACTIVE', 'STATUS_UPDATED');

    assert(updated.tradingSymbolId === null, 'RELATION_CAN_BE_CLEARED');

    assert(updated.version === 1, 'VERSION_INCREMENTED');

    const updatedAgain = await repository.update(createdA.id, {
      status: 'ACTIVE',
      tradingSymbolId,
    });

    assert(updatedAgain.status === 'ACTIVE', 'STATUS_REACTIVATED');

    assert(
      updatedAgain.tradingSymbolId === tradingSymbolId,
      'RELATION_RESTORED',
    );

    assert(updatedAgain.version === 2, 'VERSION_INCREMENTED_AGAIN');

    const deleted = await repository.deleteById(createdB.id);

    watchlistBId = null;

    assert(deleted.id === createdB.id, 'DELETE_RETURNS_DELETED_ENTRY');

    const afterDelete = await repository.findById(createdB.id);

    assert(afterDelete === null, 'DELETED_ENTRY_NOT_FOUND');

    let emptySymbolRejected = false;

    try {
      await repository.findBySymbol('   ');
    } catch {
      emptySymbolRejected = true;
    }

    assert(emptySymbolRejected, 'EMPTY_SYMBOL_REJECTED');

    let emptyIdRejected = false;

    try {
      await repository.findById('   ');
    } catch {
      emptyIdRejected = true;
    }

    assert(emptyIdRejected, 'EMPTY_ID_REJECTED');

    let emptyTradingSymbolIdRejected = false;

    try {
      await repository.update(createdA.id, {
        tradingSymbolId: '   ',
      });
    } catch {
      emptyTradingSymbolIdRejected = true;
    }

    assert(emptyTradingSymbolIdRejected, 'EMPTY_TRADING_SYMBOL_ID_REJECTED');

    let duplicateRejected = false;

    try {
      await repository.create({
        symbol: symbolA.toLowerCase(),
      });
    } catch {
      duplicateRejected = true;
    }

    assert(duplicateRejected, 'DUPLICATE_SYMBOL_REJECTED');

    console.log('PUNTO 194.2 VERIFICADO CORRECTAMENTE.');
  } finally {
    if (watchlistBId !== null) {
      await prisma.watchlistSymbol.deleteMany({
        where: {
          id: watchlistBId,
        },
      });
    }

    if (watchlistAId !== null) {
      await prisma.watchlistSymbol.deleteMany({
        where: {
          id: watchlistAId,
        },
      });
    }

    if (tradingSymbolId !== null) {
      await prisma.tradingSymbol.deleteMany({
        where: {
          id: tradingSymbolId,
        },
      });
    }

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
