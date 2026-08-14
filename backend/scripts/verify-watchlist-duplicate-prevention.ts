import type { SymbolValidationService } from '../src/symbols/symbol-validation.service';
import { AddWatchlistSymbolService } from '../src/watchlist/add-watchlist-symbol.service';
import type { WatchlistRepository } from '../src/watchlist/watchlist.repository';
import type { WatchlistEntry } from '../src/watchlist/watchlist.types';

function assert(condition: boolean, name: string): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function createEntry(symbol = 'AAPL'): WatchlistEntry {
  return {
    id: 'watchlist-198',
    symbol,
    tradingSymbolId: 'trading-symbol-198',
    status: 'ACTIVE',
    version: 0,
    createdAt: new Date('2026-08-13T12:00:00.000Z'),
    updatedAt: new Date('2026-08-13T12:00:00.000Z'),
  };
}

async function main(): Promise<void> {
  const events: string[] = [];
  let validationCalls = 0;
  let findCalls = 0;
  let createCalls = 0;
  let receivedValidationSymbol: string | null = null;
  let receivedFindSymbol: string | null = null;

  const duplicateValidationService = {
    async validateSymbol(input: { symbol: string }) {
      events.push('validate');
      validationCalls += 1;
      receivedValidationSymbol = input.symbol;

      return {
        symbol: {
          id: 'trading-symbol-198',
          symbol: 'AAPL',
        },
        validationStatus: 'VALID',
      };
    },
  } as unknown as SymbolValidationService;

  const duplicateRepository = {
    async findBySymbol(symbol: string): Promise<WatchlistEntry | null> {
      events.push('find');
      findCalls += 1;
      receivedFindSymbol = symbol;

      return createEntry();
    },

    async create(): Promise<WatchlistEntry> {
      events.push('create');
      createCalls += 1;
      return createEntry();
    },
  } as unknown as WatchlistRepository;

  const duplicateService = new AddWatchlistSymbolService(
    duplicateValidationService,
    duplicateRepository,
  );

  let duplicateRejected = false;
  let duplicateError = '';

  try {
    await duplicateService.addSymbol({
      symbol: '  aapl  ',
    });
  } catch (error: unknown) {
    duplicateRejected = true;

    duplicateError = error instanceof Error ? error.message : String(error);
  }

  assert(validationCalls === 1, 'DUPLICATE_VALIDATION_CALLED_ONCE');

  assert(
    receivedValidationSymbol === '  aapl  ',
    'ORIGINAL_INPUT_PASSED_TO_VALIDATION',
  );

  assert(findCalls === 1, 'DUPLICATE_LOOKUP_CALLED_ONCE');

  assert(
    receivedFindSymbol === 'AAPL',
    'NORMALIZED_SYMBOL_USED_FOR_DUPLICATE_LOOKUP',
  );

  assert(
    events[0] === 'validate' && events[1] === 'find',
    'VALIDATION_PRECEDES_DUPLICATE_LOOKUP',
  );

  assert(duplicateRejected, 'DUPLICATE_SYMBOL_REJECTED');

  assert(
    duplicateError === 'Watchlist symbol AAPL already exists',
    'DUPLICATE_ERROR_DETERMINISTIC',
  );

  assert(createCalls === 0, 'DUPLICATE_NOT_CREATED');

  const newEvents: string[] = [];
  let newCreateCalls = 0;
  let newCreateSymbol: string | null = null;
  let newTradingSymbolId: string | null = null;

  const newValidationService = {
    async validateSymbol() {
      newEvents.push('validate');

      return {
        symbol: {
          id: 'trading-symbol-msft',
          symbol: 'MSFT',
        },
        validationStatus: 'VALID',
      };
    },
  } as unknown as SymbolValidationService;

  const newRepository = {
    async findBySymbol(symbol: string): Promise<WatchlistEntry | null> {
      newEvents.push('find');

      assert(symbol === 'MSFT', 'NEW_SYMBOL_LOOKUP_NORMALIZED');

      return null;
    },

    async create(input: {
      symbol: string;
      tradingSymbolId?: string | null;
    }): Promise<WatchlistEntry> {
      newEvents.push('create');
      newCreateCalls += 1;
      newCreateSymbol = input.symbol;
      newTradingSymbolId = input.tradingSymbolId ?? null;

      return {
        ...createEntry('MSFT'),
        id: 'watchlist-msft',
        tradingSymbolId: 'trading-symbol-msft',
      };
    },
  } as unknown as WatchlistRepository;

  const newService = new AddWatchlistSymbolService(
    newValidationService,
    newRepository,
  );

  const result = await newService.addSymbol({
    symbol: 'msft',
  });

  assert(
    newEvents.join(',') === 'validate,find,create',
    'NEW_SYMBOL_OPERATION_ORDER_CORRECT',
  );

  assert(newCreateCalls === 1, 'NEW_SYMBOL_CREATED_ONCE');

  assert(newCreateSymbol === 'MSFT', 'NORMALIZED_NEW_SYMBOL_CREATED');

  assert(
    newTradingSymbolId === 'trading-symbol-msft',
    'TRADING_SYMBOL_ASSOCIATION_CREATED',
  );

  assert(result.entry.symbol === 'MSFT', 'NEW_ENTRY_RETURNED');

  assert(
    result.entry.tradingSymbolId === 'trading-symbol-msft',
    'NEW_ENTRY_ASSOCIATION_CORRECT',
  );

  assert(result.validationStatus === 'VALID', 'VALIDATION_STATUS_PRESERVED');

  let failedValidationFindCalls = 0;
  let failedValidationCreateCalls = 0;

  const failedValidationService = {
    async validateSymbol(): Promise<never> {
      throw new Error('Symbol validation failed');
    },
  } as unknown as SymbolValidationService;

  const untouchedRepository = {
    async findBySymbol(): Promise<null> {
      failedValidationFindCalls += 1;
      return null;
    },

    async create(): Promise<WatchlistEntry> {
      failedValidationCreateCalls += 1;
      return createEntry();
    },
  } as unknown as WatchlistRepository;

  const failedService = new AddWatchlistSymbolService(
    failedValidationService,
    untouchedRepository,
  );

  let validationFailurePreserved = false;

  try {
    await failedService.addSymbol({
      symbol: 'INVALID',
    });
  } catch (error: unknown) {
    validationFailurePreserved =
      error instanceof Error && error.message === 'Symbol validation failed';
  }

  assert(validationFailurePreserved, 'VALIDATION_FAILURE_PRESERVED');

  assert(
    failedValidationFindCalls === 0,
    'VALIDATION_FAILURE_SKIPS_DUPLICATE_LOOKUP',
  );

  assert(failedValidationCreateCalls === 0, 'VALIDATION_FAILURE_SKIPS_CREATE');

  console.log('PUNTO 198 VERIFICADO CORRECTAMENTE.');
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

