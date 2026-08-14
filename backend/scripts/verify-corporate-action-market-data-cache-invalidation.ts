import { CorporateActionMarketDataCacheInvalidationService } from '../src/corporate-actions/corporate-action-market-data-cache-invalidation.service';
import type { CorporateActionEffectiveService } from '../src/corporate-actions/corporate-action-effective.service';
import { MarketDataCacheService } from '../src/market-data/market-data-cache.service';

async function main(): Promise<void> {
  const cache = new MarketDataCacheService();

  cache.set(
    '/v2/stocks/OLD/bars?timeframe=1Day',
    { marker: 'old-bars' },
    60_000,
  );

  cache.set(
    '/v2/stocks/OLD/quotes?limit=100',
    { marker: 'old-quotes' },
    60_000,
  );

  cache.set(
    '/v2/stocks/NEW/trades?limit=100',
    { marker: 'new-trades' },
    60_000,
  );

  cache.set(
    '/v2/stocks/AAPL/bars?timeframe=1Day',
    { marker: 'aapl-bars' },
    60_000,
  );

  cache.set(
    '/v2/stocks/MSFT/quotes?limit=100',
    { marker: 'msft-quotes' },
    60_000,
  );

  let capturedQuery: any = null;

  const effectiveService = {
    async getEffectiveActions(query: Record<string, unknown>) {
      capturedQuery = query;

      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        effective: [
          {
            id: 'name-change-1',
            type: 'name_change',
            symbol: ' old ',
            processDate: new Date(
              '2026-08-10T00:00:00.000Z',
            ),
            raw: {
              old_symbol: ' old ',
              new_symbol: ' new ',
            },
          },
          {
            id: 'split-1',
            type: 'forward_split',
            symbol: 'AAPL',
            processDate: new Date(
              '2026-08-11T00:00:00.000Z',
            ),
            raw: {
              old_rate: '1',
              new_rate: '2',
            },
          },
          {
            id: 'null-symbol',
            type: 'cash_dividend',
            symbol: null,
            processDate: new Date(
              '2026-08-12T00:00:00.000Z',
            ),
            raw: {
              rate: '1',
            },
          },
        ],
      };
    },
  } as unknown as CorporateActionEffectiveService;

  const service =
    new CorporateActionMarketDataCacheInvalidationService(
      cache,
      effectiveService,
    );

  const asOf = new Date(
    '2026-08-13T15:30:00.000Z',
  );

  const before = cache.getSnapshot();

  const result =
    await service.invalidateAffectedCache({
      symbols: ['OLD', 'AAPL'],
      asOf,
      start: '2026-01-01',
    });

  const after = cache.getSnapshot();

  const nameChange = result.items.find(
    (item) =>
      item.corporateActionId === 'name-change-1',
  );

  const split = result.items.find(
    (item) =>
      item.corporateActionId === 'split-1',
  );

  const nullSymbol = result.items.find(
    (item) =>
      item.corporateActionId === 'null-symbol',
  );

  const checks: Record<string, boolean> = {
    QUERY_SYMBOLS_PRESERVED:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols.length === 2 &&
      capturedQuery.symbols[0] === 'OLD' &&
      capturedQuery.symbols[1] === 'AAPL',

    QUERY_START_PRESERVED:
      capturedQuery?.start === '2026-01-01',

    QUERY_AS_OF_PRESERVED:
      capturedQuery?.asOf === asOf,

    THREE_RESULTS_CREATED:
      result.items.length === 3,

    NAME_CHANGE_OLD_SYMBOL_INCLUDED:
      nameChange?.affectedSymbols.includes('OLD') ===
      true,

    NAME_CHANGE_NEW_SYMBOL_INCLUDED:
      nameChange?.affectedSymbols.includes('NEW') ===
      true,

    NAME_CHANGE_SYMBOLS_DEDUPLICATED:
      nameChange?.affectedSymbols.length === 2,

    NAME_CHANGE_CACHE_INVALIDATED:
      nameChange?.invalidatedEntryCount === 3,

    SPLIT_SYMBOL_INCLUDED:
      split?.affectedSymbols.length === 1 &&
      split.affectedSymbols[0] === 'AAPL',

    SPLIT_CACHE_INVALIDATED:
      split?.invalidatedEntryCount === 1,

    NULL_SYMBOL_HAS_NO_AFFECTED_SYMBOLS:
      nullSymbol?.affectedSymbols.length === 0,

    NULL_SYMBOL_INVALIDATES_NOTHING:
      nullSymbol?.invalidatedEntryCount === 0,

    TOTAL_AFFECTED_SYMBOL_COUNT_CORRECT:
      result.affectedSymbolCount === 3,

    TOTAL_INVALIDATED_ENTRY_COUNT_CORRECT:
      result.invalidatedEntryCount === 4,

    UNRELATED_MSFT_CACHE_PRESERVED:
      cache.get(
        '/v2/stocks/MSFT/quotes?limit=100',
      ) !== null,

    OLD_CACHE_REMOVED:
      cache.get(
        '/v2/stocks/OLD/bars?timeframe=1Day',
      ) === null &&
      cache.get(
        '/v2/stocks/OLD/quotes?limit=100',
      ) === null,

    NEW_CACHE_REMOVED:
      cache.get(
        '/v2/stocks/NEW/trades?limit=100',
      ) === null,

    AAPL_CACHE_REMOVED:
      cache.get(
        '/v2/stocks/AAPL/bars?timeframe=1Day',
      ) === null,

    CACHE_NOT_GLOBALLY_CLEARED:
      after.entries === before.entries - 4,

    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf !== asOf,

    PROCESS_DATE_PRESERVED:
      nameChange?.processDate.toISOString() ===
      '2026-08-10T00:00:00.000Z',
  };

  const createInvalidService = (
    action: Record<string, unknown>,
  ) => {
    const dependency = {
      async getEffectiveActions() {
        return {
          asOf: new Date(
            '2026-08-13T00:00:00.000Z',
          ),
          effective: [action],
        };
      },
    } as unknown as CorporateActionEffectiveService;

    return new CorporateActionMarketDataCacheInvalidationService(
      new MarketDataCacheService(),
      dependency,
    );
  };

  const expectRejected = async (
    name: string,
    action: () => Promise<unknown>,
  ): Promise<void> => {
    try {
      await action();
      checks[name] = false;
    } catch {
      checks[name] = true;
    }
  };

  await expectRejected(
    'INVALID_ID_REJECTED',
    () =>
      createInvalidService({
        id: '   ',
        type: 'forward_split',
        symbol: 'AAPL',
        processDate: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        raw: {},
      }).invalidateAffectedCache(),
  );

  await expectRejected(
    'INVALID_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        id: 'bad-symbol',
        type: 'forward_split',
        symbol: 'BAD SYMBOL',
        processDate: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        raw: {},
      }).invalidateAffectedCache(),
  );

  await expectRejected(
    'MISSING_OLD_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        id: 'missing-old',
        type: 'name_change',
        symbol: 'OLD',
        processDate: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        raw: {
          new_symbol: 'NEW',
        },
      }).invalidateAffectedCache(),
  );

  await expectRejected(
    'MISSING_NEW_SYMBOL_REJECTED',
    () =>
      createInvalidService({
        id: 'missing-new',
        type: 'name_change',
        symbol: 'OLD',
        processDate: new Date(
          '2026-08-13T00:00:00.000Z',
        ),
        raw: {
          old_symbol: 'OLD',
        },
      }).invalidateAffectedCache(),
  );

  await expectRejected(
    'INVALID_PROCESS_DATE_REJECTED',
    () =>
      createInvalidService({
        id: 'bad-date',
        type: 'forward_split',
        symbol: 'AAPL',
        processDate: new Date(Number.NaN),
        raw: {},
      }).invalidateAffectedCache(),
  );

  const prefixCache =
    new MarketDataCacheService();

  prefixCache.set(
    '/v2/stocks/AAA/bars?x=1',
    { value: 1 },
    60_000,
  );

  prefixCache.set(
    '/v2/stocks/AAA/quotes?x=2',
    { value: 2 },
    60_000,
  );

  prefixCache.set(
    '/v2/stocks/AA/bars?x=3',
    { value: 3 },
    60_000,
  );

  const deleted =
    prefixCache.deleteByPrefix(
      '/v2/stocks/AAA/',
    );

  checks.DELETE_BY_PREFIX_COUNT_CORRECT =
    deleted === 2;

  checks.DELETE_BY_PREFIX_IS_SELECTIVE =
    prefixCache.get(
      '/v2/stocks/AA/bars?x=3',
    ) !== null;

  await expectRejected(
    'EMPTY_PREFIX_REJECTED',
    async () => {
      prefixCache.deleteByPrefix('   ');
    },
  );

  const secondRun =
    await service.invalidateAffectedCache({
      symbols: ['OLD', 'AAPL'],
      asOf,
      start: '2026-01-01',
    });

  checks.SECOND_RUN_IS_IDEMPOTENT =
    secondRun.invalidatedEntryCount === 0 &&
    secondRun.items.every(
      (item) =>
        item.invalidatedEntryCount === 0,
    );

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 187 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 187 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 187 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
