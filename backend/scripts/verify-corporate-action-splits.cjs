const assert = require('node:assert/strict');

const {
  CorporateActionSplitService,
} = require('../dist/src/corporate-actions/corporate-action-split.service.js');

async function main() {
  const receivedQueries = [];

  const corporateActionsService = {
    async getAllCorporateActions(query) {
      receivedQueries.push(structuredClone(query));

      return {
        items: [
          {
            id: 'forward-1',
            type: 'forward_split',
            symbol: 'AAPL',
            processDate: new Date('2026-08-01T00:00:00.000Z'),
            raw: {
              id: 'forward-1',
              symbol: 'AAPL',
              process_date: '2026-08-01',
              old_rate: '1',
              new_rate: '4',
            },
          },
          {
            id: 'reverse-1',
            type: 'reverse_split',
            symbol: 'XYZ',
            processDate: new Date('2026-08-02T00:00:00.000Z'),
            raw: {
              id: 'reverse-1',
              symbol: 'XYZ',
              process_date: '2026-08-02',
              old_rate: '10',
              new_rate: '1',
            },
          },
        ],
        pagesFetched: 1,
        complete: true,
        nextPageToken: null,
      };
    },
  };

  const service = new CorporateActionSplitService(
    corporateActionsService,
  );

  const result = await service.getSplits({
    symbol: ' aapl ',
    start: '2026-08-01',
    end: '2026-08-31',
  });

  const forward = result.splits.find(
    (item) => item.id === 'forward-1',
  );

  const reverse = result.splits.find(
    (item) => item.id === 'reverse-1',
  );

  let invalidSymbolRejected = false;
  try {
    await service.getSplits({
      symbol: 'BAD SYMBOL',
    });
  } catch {
    invalidSymbolRejected = true;
  }

  let missingSymbolRejected = false;
  try {
    const brokenService = new CorporateActionSplitService({
      async getAllCorporateActions() {
        return {
          items: [
            {
              id: 'broken-symbol',
              type: 'forward_split',
              symbol: null,
              processDate: new Date('2026-08-01T00:00:00.000Z'),
              raw: {
                old_rate: '1',
                new_rate: '2',
              },
            },
          ],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    });

    await brokenService.getSplits({
      symbol: 'AAPL',
    });
  } catch {
    missingSymbolRejected = true;
  }

  let missingDateRejected = false;
  try {
    const brokenService = new CorporateActionSplitService({
      async getAllCorporateActions() {
        return {
          items: [
            {
              id: 'broken-date',
              type: 'forward_split',
              symbol: 'AAPL',
              processDate: null,
              raw: {
                old_rate: '1',
                new_rate: '2',
              },
            },
          ],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    });

    await brokenService.getSplits({
      symbol: 'AAPL',
    });
  } catch {
    missingDateRejected = true;
  }

  let invalidOldRateRejected = false;
  try {
    const brokenService = new CorporateActionSplitService({
      async getAllCorporateActions() {
        return {
          items: [
            {
              id: 'broken-old-rate',
              type: 'forward_split',
              symbol: 'AAPL',
              processDate: new Date('2026-08-01T00:00:00.000Z'),
              raw: {
                old_rate: '0',
                new_rate: '2',
              },
            },
          ],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    });

    await brokenService.getSplits({
      symbol: 'AAPL',
    });
  } catch {
    invalidOldRateRejected = true;
  }

  let invalidNewRateRejected = false;
  try {
    const brokenService = new CorporateActionSplitService({
      async getAllCorporateActions() {
        return {
          items: [
            {
              id: 'broken-new-rate',
              type: 'forward_split',
              symbol: 'AAPL',
              processDate: new Date('2026-08-01T00:00:00.000Z'),
              raw: {
                old_rate: '1',
                new_rate: 'abc',
              },
            },
          ],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    });

    await brokenService.getSplits({
      symbol: 'AAPL',
    });
  } catch {
    invalidNewRateRejected = true;
  }

  let invalidForwardDirectionRejected = false;
  try {
    const brokenService = new CorporateActionSplitService({
      async getAllCorporateActions() {
        return {
          items: [
            {
              id: 'bad-forward',
              type: 'forward_split',
              symbol: 'AAPL',
              processDate: new Date('2026-08-01T00:00:00.000Z'),
              raw: {
                old_rate: '4',
                new_rate: '1',
              },
            },
          ],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    });

    await brokenService.getSplits({
      symbol: 'AAPL',
    });
  } catch {
    invalidForwardDirectionRejected = true;
  }

  let invalidReverseDirectionRejected = false;
  try {
    const brokenService = new CorporateActionSplitService({
      async getAllCorporateActions() {
        return {
          items: [
            {
              id: 'bad-reverse',
              type: 'reverse_split',
              symbol: 'AAPL',
              processDate: new Date('2026-08-01T00:00:00.000Z'),
              raw: {
                old_rate: '1',
                new_rate: '10',
              },
            },
          ],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    });

    await brokenService.getSplits({
      symbol: 'AAPL',
    });
  } catch {
    invalidReverseDirectionRejected = true;
  }

  const originalDate = forward.processDate.toISOString();

  forward.processDate.setUTCFullYear(2000);

  const secondResult = await service.getSplits({
    symbol: 'AAPL',
  });

  const secondForward = secondResult.splits.find(
    (item) => item.id === 'forward-1',
  );

  const firstQuery = receivedQueries[0];

  const assertions = {
    SYMBOL_NORMALIZED:
      result.symbol === 'AAPL',

    QUERY_SCOPED_TO_SPLITS:
      Array.isArray(firstQuery?.types) &&
      firstQuery.types.length === 2 &&
      firstQuery.types.includes('forward_split') &&
      firstQuery.types.includes('reverse_split'),

    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(firstQuery?.symbols) &&
      firstQuery.symbols.length === 1 &&
      firstQuery.symbols[0] === 'AAPL',

    DATE_FILTERS_PRESERVED:
      firstQuery?.start === '2026-08-01' &&
      firstQuery?.end === '2026-08-31',

    SORT_ASC_USED:
      firstQuery?.sort === 'asc',

    FORWARD_SPLIT_DETECTED:
      forward?.type === 'forward_split',

    FORWARD_RATIO_PRESERVED:
      forward?.oldRate === 1 &&
      forward?.newRate === 4,

    FORWARD_FACTOR_CALCULATED:
      forward?.shareFactor === 4,

    REVERSE_SPLIT_DETECTED:
      reverse?.type === 'reverse_split',

    REVERSE_RATIO_PRESERVED:
      reverse?.oldRate === 10 &&
      reverse?.newRate === 1,

    REVERSE_FACTOR_CALCULATED:
      reverse?.shareFactor === 0.1,

    PROCESS_DATE_PRESERVED:
      originalDate === '2026-08-01T00:00:00.000Z',

    PROCESS_DATE_DEFENSIVELY_COPIED:
      secondForward?.processDate.toISOString() ===
        '2026-08-01T00:00:00.000Z',

    INVALID_SYMBOL_REJECTED:
      invalidSymbolRejected,

    MISSING_SYMBOL_REJECTED:
      missingSymbolRejected,

    MISSING_PROCESS_DATE_REJECTED:
      missingDateRejected,

    INVALID_OLD_RATE_REJECTED:
      invalidOldRateRejected,

    INVALID_NEW_RATE_REJECTED:
      invalidNewRateRejected,

    INVALID_FORWARD_DIRECTION_REJECTED:
      invalidForwardDirectionRejected,

    INVALID_REVERSE_DIRECTION_REJECTED:
      invalidReverseDirectionRejected,
  };

  for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
  }

  assert.ok(
    Object.values(assertions).every(Boolean),
    'Una o más verificaciones del punto 170 fallaron',
  );

  console.log('PUNTO 170 VERIFICADO CORRECTAMENTE.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});