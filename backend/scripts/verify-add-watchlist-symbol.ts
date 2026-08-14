import type { SymbolValidationService } from '../src/symbols/symbol-validation.service';
import type { SymbolValidationResult } from '../src/symbols/symbol-validation.types';
import { AddWatchlistSymbolService } from '../src/watchlist/add-watchlist-symbol.service';
import type { WatchlistEntry } from '../src/watchlist/watchlist.types';
import type { WatchlistRepository } from '../src/watchlist/watchlist.repository';

function assert(condition: boolean, name: string): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

async function main(): Promise<void> {
  const now = new Date('2026-08-13T12:00:00.000Z');

  const tradingSymbol = {
    id: 'trading-symbol-195',
    symbol: 'AAPL',
    status: 'ACTIVE',
    alpacaAssetId: 'alpaca-asset-aapl',
    assetClass: 'us_equity',
    exchange: 'NASDAQ',
    name: 'Apple Inc.',
    alpacaStatus: 'active',
    tradable: true,
    fractionable: true,
    shortable: true,
    easyToBorrow: true,
    version: 0,
    createdAt: now,
    updatedAt: now,
    lastValidatedAt: now,
  } as const;

  const validationResult = {
    symbol: tradingSymbol,
    validationStatus: 'VALID',
  } as unknown as SymbolValidationResult;

  let validationCalls = 0;
  let receivedValidationSymbol: string | null = null;

  const symbolValidationService = {
    async validateSymbol(input: {
      symbol: string;
    }): Promise<SymbolValidationResult> {
      validationCalls += 1;
      receivedValidationSymbol = input.symbol;

      return validationResult;
    },
  } as unknown as SymbolValidationService;

  let createCalls = 0;
  let receivedCreateInput: {
    symbol: string;
    tradingSymbolId?: string | null;
  } | null = null;

  const persistedEntry: WatchlistEntry = {
    id: 'watchlist-195',
    symbol: 'AAPL',
    tradingSymbolId: tradingSymbol.id,
    status: 'ACTIVE',
    version: 0,
    createdAt: now,
    updatedAt: now,
  };

  const watchlistRepository = {
    async findBySymbol(): Promise<WatchlistEntry | null> {
      return null;
    },

    async create(input: {
      symbol: string;
      tradingSymbolId?: string | null;
    }): Promise<WatchlistEntry> {
      createCalls += 1;
      receivedCreateInput = {
        ...input,
      };

      return {
        ...persistedEntry,
        createdAt: new Date(persistedEntry.createdAt),
        updatedAt: new Date(persistedEntry.updatedAt),
      };
    },
  } as unknown as WatchlistRepository;

  const service = new AddWatchlistSymbolService(
    symbolValidationService,
    watchlistRepository,
  );

  const result = await service.addSymbol({
    symbol: '  aapl  ',
  });

  assert(validationCalls === 1, 'VALIDATION_CALLED_ONCE');

  assert(receivedValidationSymbol === '  aapl  ', 'INPUT_PASSED_TO_VALIDATION');

  assert(createCalls === 1, 'REPOSITORY_CREATE_CALLED_ONCE');

  const capturedCreateInput = receivedCreateInput as {
    symbol: string;
    tradingSymbolId?: string | null;
  } | null;

  assert(
    capturedCreateInput !== null && capturedCreateInput.symbol === 'AAPL',
    'NORMALIZED_VALIDATED_SYMBOL_PERSISTED',
  );

  assert(
    capturedCreateInput !== null &&
      capturedCreateInput.tradingSymbolId === tradingSymbol.id,
    'TRADING_SYMBOL_ID_ASSOCIATED',
  );

  assert(result.entry.id === persistedEntry.id, 'WATCHLIST_ENTRY_RETURNED');

  assert(result.entry.symbol === 'AAPL', 'RESULT_SYMBOL_CORRECT');

  assert(
    result.entry.tradingSymbolId === tradingSymbol.id,
    'RESULT_ASSOCIATION_CORRECT',
  );

  assert(result.entry.status === 'ACTIVE', 'RESULT_STATUS_PRESERVED');

  assert(result.entry.version === 0, 'RESULT_VERSION_PRESERVED');

  assert(result.validationStatus === 'VALID', 'VALIDATION_STATUS_PRESERVED');

  let validationFailurePreventedCreate = false;

  const failingValidationService = {
    async validateSymbol(): Promise<never> {
      throw new Error('Invalid Alpaca symbol');
    },
  } as unknown as SymbolValidationService;

  let invalidCreateCalls = 0;

  const repositoryForInvalidSymbol = {
    async create(): Promise<WatchlistEntry> {
      invalidCreateCalls += 1;
      return persistedEntry;
    },
  } as unknown as WatchlistRepository;

  const failingService = new AddWatchlistSymbolService(
    failingValidationService,
    repositoryForInvalidSymbol,
  );

  try {
    await failingService.addSymbol({
      symbol: 'INVALID',
    });
  } catch {
    validationFailurePreventedCreate = invalidCreateCalls === 0;
  }

  assert(
    validationFailurePreventedCreate,
    'VALIDATION_FAILURE_PREVENTS_PERSISTENCE',
  );

  let duplicateRejected = false;

  const duplicateRepository = {
    async create(): Promise<never> {
      throw new Error('Unique constraint failed on symbol');
    },
  } as unknown as WatchlistRepository;

  const duplicateService = new AddWatchlistSymbolService(
    symbolValidationService,
    duplicateRepository,
  );

  try {
    await duplicateService.addSymbol({
      symbol: 'AAPL',
    });
  } catch {
    duplicateRejected = true;
  }

  assert(duplicateRejected, 'DUPLICATE_SYMBOL_REJECTED');

  console.log('PUNTO 195 VERIFICADO CORRECTAMENTE.');
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


