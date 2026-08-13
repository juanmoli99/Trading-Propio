import { SetWatchlistSymbolActiveService } from '../src/watchlist/set-watchlist-symbol-active.service';
import type { WatchlistRepository } from '../src/watchlist/watchlist.repository';
import type { WatchlistEntry } from '../src/watchlist/watchlist.types';

function assert(condition: boolean, name: string): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function createEntry(overrides: Partial<WatchlistEntry> = {}): WatchlistEntry {
  return {
    id: 'watchlist-197',
    symbol: 'AAPL',
    tradingSymbolId: 'trading-symbol-197',
    status: 'ACTIVE',
    version: 4,
    createdAt: new Date('2026-08-13T12:00:00.000Z'),
    updatedAt: new Date('2026-08-13T12:30:00.000Z'),
    ...overrides,
  };
}

async function main(): Promise<void> {
  const activeEntry = createEntry();

  let findCalls = 0;
  let updateCalls = 0;
  let receivedFindSymbol: string | null = null;
  let receivedUpdateId: string | null = null;
  let receivedUpdateStatus: string | null = null;

  const deactivateRepository = {
    async findBySymbol(symbol: string): Promise<WatchlistEntry | null> {
      findCalls += 1;
      receivedFindSymbol = symbol;
      return activeEntry;
    },

    async update(
      id: string,
      input: {
        status?: string;
      },
    ): Promise<WatchlistEntry> {
      updateCalls += 1;
      receivedUpdateId = id;
      receivedUpdateStatus = input.status ?? null;

      return createEntry({
        status: 'INACTIVE',
        version: 5,
      });
    },
  } as unknown as WatchlistRepository;

  const deactivateService = new SetWatchlistSymbolActiveService(
    deactivateRepository,
  );

  const deactivated = await deactivateService.setActive({
    symbol: '  aapl  ',
    active: false,
  });

  assert(findCalls === 1, 'FIND_CALLED_ONCE');

  assert(receivedFindSymbol === 'AAPL', 'SYMBOL_NORMALIZED_BEFORE_FIND');

  assert(updateCalls === 1, 'DEACTIVATION_UPDATE_CALLED_ONCE');

  assert(receivedUpdateId === activeEntry.id, 'EXACT_ENTRY_ID_UPDATED');

  assert(receivedUpdateStatus === 'INACTIVE', 'INACTIVE_STATUS_REQUESTED');

  assert(deactivated.changed === true, 'DEACTIVATION_CHANGED_TRUE');

  assert(deactivated.entry.status === 'INACTIVE', 'DEACTIVATED_STATUS_CORRECT');

  assert(deactivated.entry.symbol === 'AAPL', 'DEACTIVATED_SYMBOL_CORRECT');

  assert(
    deactivated.entry.tradingSymbolId === activeEntry.tradingSymbolId,
    'TRADING_SYMBOL_ASSOCIATION_PRESERVED',
  );

  assert(deactivated.entry.version === 5, 'UPDATED_VERSION_PRESERVED');

  const inactiveEntry = createEntry({
    status: 'INACTIVE',
    version: 8,
  });

  let activationUpdateCalls = 0;
  let activationStatus: string | null = null;

  const activateRepository = {
    async findBySymbol(): Promise<WatchlistEntry> {
      return inactiveEntry;
    },

    async update(
      id: string,
      input: {
        status?: string;
      },
    ): Promise<WatchlistEntry> {
      activationUpdateCalls += 1;
      activationStatus = input.status ?? null;

      assert(id === inactiveEntry.id, 'ACTIVATION_EXACT_ID_UPDATED');

      return createEntry({
        status: 'ACTIVE',
        version: 9,
      });
    },
  } as unknown as WatchlistRepository;

  const activateService = new SetWatchlistSymbolActiveService(
    activateRepository,
  );

  const activated = await activateService.setActive({
    symbol: 'AAPL',
    active: true,
  });

  assert(activationUpdateCalls === 1, 'ACTIVATION_UPDATE_CALLED_ONCE');

  assert(activationStatus === 'ACTIVE', 'ACTIVE_STATUS_REQUESTED');

  assert(activated.changed === true, 'ACTIVATION_CHANGED_TRUE');

  assert(activated.entry.status === 'ACTIVE', 'ACTIVATED_STATUS_CORRECT');

  assert(activated.entry.version === 9, 'ACTIVATED_VERSION_PRESERVED');

  let idempotentUpdateCalls = 0;

  const idempotentRepository = {
    async findBySymbol(): Promise<WatchlistEntry> {
      return activeEntry;
    },

    async update(): Promise<WatchlistEntry> {
      idempotentUpdateCalls += 1;
      return activeEntry;
    },
  } as unknown as WatchlistRepository;

  const idempotentService = new SetWatchlistSymbolActiveService(
    idempotentRepository,
  );

  const idempotentResult = await idempotentService.setActive({
    symbol: 'AAPL',
    active: true,
  });

  assert(idempotentResult.changed === false, 'SAME_STATE_CHANGED_FALSE');

  assert(idempotentUpdateCalls === 0, 'SAME_STATE_DOES_NOT_WRITE');

  assert(idempotentResult.entry.version === 4, 'SAME_STATE_VERSION_UNCHANGED');

  let missingUpdateCalls = 0;

  const missingRepository = {
    async findBySymbol(): Promise<null> {
      return null;
    },

    async update(): Promise<WatchlistEntry> {
      missingUpdateCalls += 1;
      return activeEntry;
    },
  } as unknown as WatchlistRepository;

  const missingService = new SetWatchlistSymbolActiveService(missingRepository);

  let missingRejected = false;

  try {
    await missingService.setActive({
      symbol: 'MSFT',
      active: false,
    });
  } catch {
    missingRejected = true;
  }

  assert(missingRejected, 'MISSING_SYMBOL_REJECTED');

  assert(missingUpdateCalls === 0, 'MISSING_SYMBOL_NOT_UPDATED');

  const invalidSymbols = ['', '   ', 'A'.repeat(33)];

  for (const symbol of invalidSymbols) {
    let repositoryCalls = 0;

    const repository = {
      async findBySymbol(): Promise<WatchlistEntry> {
        repositoryCalls += 1;
        return activeEntry;
      },

      async update(): Promise<WatchlistEntry> {
        repositoryCalls += 1;
        return activeEntry;
      },
    } as unknown as WatchlistRepository;

    const service = new SetWatchlistSymbolActiveService(repository);

    let rejected = false;

    try {
      await service.setActive({
        symbol,
        active: true,
      });
    } catch {
      rejected = true;
    }

    assert(rejected, `INVALID_SYMBOL_REJECTED_${JSON.stringify(symbol)}`);

    assert(
      repositoryCalls === 0,
      `INVALID_SYMBOL_NO_REPOSITORY_CALL_${JSON.stringify(symbol)}`,
    );
  }

  let invalidBooleanRepositoryCalls = 0;

  const invalidBooleanRepository = {
    async findBySymbol(): Promise<WatchlistEntry> {
      invalidBooleanRepositoryCalls += 1;
      return activeEntry;
    },

    async update(): Promise<WatchlistEntry> {
      invalidBooleanRepositoryCalls += 1;
      return activeEntry;
    },
  } as unknown as WatchlistRepository;

  const invalidBooleanService = new SetWatchlistSymbolActiveService(
    invalidBooleanRepository,
  );

  let invalidBooleanRejected = false;

  try {
    await invalidBooleanService.setActive({
      symbol: 'AAPL',
      active: 'false' as unknown as boolean,
    });
  } catch {
    invalidBooleanRejected = true;
  }

  assert(invalidBooleanRejected, 'NON_BOOLEAN_ACTIVE_REJECTED');

  assert(
    invalidBooleanRepositoryCalls === 0,
    'NON_BOOLEAN_ACTIVE_NO_REPOSITORY_CALL',
  );

  const mismatchRepository = {
    async findBySymbol(): Promise<WatchlistEntry> {
      return activeEntry;
    },

    async update(): Promise<WatchlistEntry> {
      return createEntry({
        symbol: 'MSFT',
        status: 'INACTIVE',
      });
    },
  } as unknown as WatchlistRepository;

  const mismatchService = new SetWatchlistSymbolActiveService(
    mismatchRepository,
  );

  let mismatchRejected = false;

  try {
    await mismatchService.setActive({
      symbol: 'AAPL',
      active: false,
    });
  } catch {
    mismatchRejected = true;
  }

  assert(mismatchRejected, 'UPDATED_SYMBOL_MISMATCH_REJECTED');

  const wrongStatusRepository = {
    async findBySymbol(): Promise<WatchlistEntry> {
      return activeEntry;
    },

    async update(): Promise<WatchlistEntry> {
      return createEntry({
        status: 'ACTIVE',
      });
    },
  } as unknown as WatchlistRepository;

  const wrongStatusService = new SetWatchlistSymbolActiveService(
    wrongStatusRepository,
  );

  let wrongStatusRejected = false;

  try {
    await wrongStatusService.setActive({
      symbol: 'AAPL',
      active: false,
    });
  } catch {
    wrongStatusRejected = true;
  }

  assert(wrongStatusRejected, 'UNPERSISTED_TARGET_STATUS_REJECTED');

  console.log('PUNTO 197 VERIFICADO CORRECTAMENTE.');
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
