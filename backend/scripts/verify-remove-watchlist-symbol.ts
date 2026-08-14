import { RemoveWatchlistSymbolService } from '../src/watchlist/remove-watchlist-symbol.service';
import type { WatchlistRepository } from '../src/watchlist/watchlist.repository';
import type { WatchlistEntry } from '../src/watchlist/watchlist.types';

function assert(condition: boolean, name: string): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  const createdAt = new Date('2026-08-13T12:00:00.000Z');

  const updatedAt = new Date('2026-08-13T12:30:00.000Z');

  const existingEntry: WatchlistEntry = {
    id: 'watchlist-196',
    symbol: 'AAPL',
    tradingSymbolId: 'trading-symbol-196',
    status: 'ACTIVE',
    version: 3,
    createdAt,
    updatedAt,
  };

  let findCalls = 0;
  let receivedFindSymbol: string | null = null;
  let deleteCalls = 0;
  let receivedDeleteId: string | null = null;

  const repository = {
    async findBySymbol(symbol: string): Promise<WatchlistEntry | null> {
      findCalls += 1;
      receivedFindSymbol = symbol;

      return {
        ...existingEntry,
        createdAt: new Date(existingEntry.createdAt),
        updatedAt: new Date(existingEntry.updatedAt),
      };
    },

    async deleteById(id: string): Promise<WatchlistEntry> {
      deleteCalls += 1;
      receivedDeleteId = id;

      return {
        ...existingEntry,
        createdAt: new Date(existingEntry.createdAt),
        updatedAt: new Date(existingEntry.updatedAt),
      };
    },
  } as unknown as WatchlistRepository;

  const service = new RemoveWatchlistSymbolService(repository);

  const result = await service.removeSymbol({
    symbol: '  aapl  ',
  });

  assert(findCalls === 1, 'FIND_CALLED_ONCE');

  assert(receivedFindSymbol === 'AAPL', 'SYMBOL_NORMALIZED_BEFORE_FIND');

  assert(deleteCalls === 1, 'DELETE_CALLED_ONCE');

  assert(receivedDeleteId === existingEntry.id, 'EXACT_ENTRY_ID_DELETED');

  assert(result.removed.id === existingEntry.id, 'REMOVED_ID_PRESERVED');

  assert(result.removed.symbol === 'AAPL', 'REMOVED_SYMBOL_PRESERVED');

  assert(
    result.removed.tradingSymbolId === existingEntry.tradingSymbolId,
    'TRADING_SYMBOL_ASSOCIATION_PRESERVED',
  );

  assert(result.removed.status === 'ACTIVE', 'STATUS_PRESERVED');

  assert(result.removed.version === 3, 'VERSION_PRESERVED');

  assert(
    result.removed.createdAt.getTime() === createdAt.getTime(),
    'CREATED_AT_PRESERVED',
  );

  assert(
    result.removed.updatedAt.getTime() === updatedAt.getTime(),
    'UPDATED_AT_PRESERVED',
  );

  let missingDeleteCalls = 0;

  const missingRepository = {
    async findBySymbol(): Promise<null> {
      return null;
    },

    async deleteById(): Promise<WatchlistEntry> {
      missingDeleteCalls += 1;
      return existingEntry;
    },
  } as unknown as WatchlistRepository;

  const missingService = new RemoveWatchlistSymbolService(missingRepository);

  let missingRejected = false;

  try {
    await missingService.removeSymbol({
      symbol: 'MSFT',
    });
  } catch {
    missingRejected = true;
  }

  assert(missingRejected, 'MISSING_SYMBOL_REJECTED');

  assert(missingDeleteCalls === 0, 'MISSING_SYMBOL_NOT_DELETED');

  const invalidSymbols = ['', '   ', 'A'.repeat(33)];

  for (const invalidSymbol of invalidSymbols) {
    let invalidFindCalls = 0;
    let invalidDeleteCalls = 0;

    const invalidRepository = {
      async findBySymbol(): Promise<WatchlistEntry | null> {
        invalidFindCalls += 1;
        return existingEntry;
      },

      async deleteById(): Promise<WatchlistEntry> {
        invalidDeleteCalls += 1;
        return existingEntry;
      },
    } as unknown as WatchlistRepository;

    const invalidService = new RemoveWatchlistSymbolService(invalidRepository);

    let rejected = false;

    try {
      await invalidService.removeSymbol({
        symbol: invalidSymbol,
      });
    } catch {
      rejected = true;
    }

    assert(
      rejected,
      `INVALID_SYMBOL_REJECTED_${JSON.stringify(invalidSymbol)}`,
    );

    assert(
      invalidFindCalls === 0,
      `INVALID_SYMBOL_NOT_QUERIED_${JSON.stringify(invalidSymbol)}`,
    );

    assert(
      invalidDeleteCalls === 0,
      `INVALID_SYMBOL_NOT_DELETED_${JSON.stringify(invalidSymbol)}`,
    );
  }

  let mismatchRejected = false;

  const mismatchRepository = {
    async findBySymbol(): Promise<WatchlistEntry> {
      return existingEntry;
    },

    async deleteById(): Promise<WatchlistEntry> {
      return {
        ...existingEntry,
        symbol: 'MSFT',
      };
    },
  } as unknown as WatchlistRepository;

  const mismatchService = new RemoveWatchlistSymbolService(mismatchRepository);

  try {
    await mismatchService.removeSymbol({
      symbol: 'AAPL',
    });
  } catch {
    mismatchRejected = true;
  }

  assert(mismatchRejected, 'DELETE_RESULT_SYMBOL_MISMATCH_REJECTED');

  console.log('PUNTO 196 VERIFICADO CORRECTAMENTE.');
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

