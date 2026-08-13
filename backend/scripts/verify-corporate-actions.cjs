const assert = require('node:assert/strict');

const {
  CorporateActionsService,
} = require('../dist/src/corporate-actions/corporate-actions.service.js');

async function main() {
  const requests = [];

  const pages = new Map([
    [undefined, {
      reverse_splits: [
        {
          id: 'ca-1',
          symbol: 'aapl',
          process_date: '2026-08-01',
          old_rate: '1',
          new_rate: '4',
        },
      ],
      cash_dividends: [
        {
          id: 'ca-2',
          symbol: 'msft',
          process_date: '2026-08-02',
          rate: '0.83',
        },
      ],
      next_page_token: 'page-2',
    }],
    ['page-2', {
      name_changes: [
        {
          id: 'ca-3',
          symbol: 'meta',
          process_date: '2026-08-03',
          old_name: 'Old Name',
          new_name: 'New Name',
        },
      ],
      reorganizations: [
        {
          id: 'ca-4',
          symbol: 'nvda',
          process_date: '2026-08-04',
        },
      ],
      partial_calls: [],
      next_page_token: null,
    }],
  ]);

  const client = {
    async request(request) {
      requests.push(structuredClone(request));

      const pageToken = request.query?.page_token;

      return {
        status: 200,
        data: pages.get(pageToken),
        headers: {},
      };
    },
  };

  const pagination = {
    async collect(fetchPage, options = {}) {
      const items = [];
      let pagesFetched = 0;
      let pageToken;

      while (true) {
        const page = await fetchPage(pageToken);
        pagesFetched += 1;
        items.push(...page.items);

        if (page.nextPageToken === null) {
          return {
            items,
            pagesFetched,
            complete: true,
            nextPageToken: null,
          };
        }

        pageToken = page.nextPageToken;
      }
    },
  };

  const service = new CorporateActionsService(
    client,
    pagination,
  );

  const firstPage = await service.getCorporateActions({
    symbols: ['aapl', 'MSFT'],
    types: ['reverse_split', 'cash_dividend'],
    start: '2026-08-01',
    end: '2026-08-31',
    limit: 100,
    sort: 'asc',
  });

  const all = await service.getAllCorporateActions({
    symbols: ['AAPL'],
  });

  let invalidLimitRejected = false;
  try {
    await service.getCorporateActions({ limit: 1001 });
  } catch {
    invalidLimitRejected = true;
  }

  let duplicateSymbolsRejected = false;
  try {
    await service.getCorporateActions({
      symbols: ['AAPL', 'aapl'],
    });
  } catch {
    duplicateSymbolsRejected = true;
  }

  let duplicateTypesRejected = false;
  try {
    await service.getCorporateActions({
      types: ['cash_dividend', 'cash_dividend'],
    });
  } catch {
    duplicateTypesRejected = true;
  }

  let invalidDateRejected = false;
  try {
    await service.getCorporateActions({
      start: '2026/08/01',
    });
  } catch {
    invalidDateRejected = true;
  }

  let invertedRangeRejected = false;
  try {
    await service.getCorporateActions({
      start: '2026-08-31',
      end: '2026-08-01',
    });
  } catch {
    invertedRangeRejected = true;
  }

  let idsCombinedWithFiltersRejected = false;
  try {
    await service.getCorporateActions({
      ids: ['ca-1'],
      symbols: ['AAPL'],
    });
  } catch {
    idsCombinedWithFiltersRejected = true;
  }

  const firstRequest = requests[0];

  const assertions = {
    CORRECT_ENDPOINT_USED:
      firstRequest?.path === '/v1/corporate-actions',

    SYMBOLS_NORMALIZED:
      firstRequest?.query?.symbols === 'AAPL,MSFT',

    TYPES_SERIALIZED:
      firstRequest?.query?.types === 'reverse_split,cash_dividend',

    DATE_FILTERS_PRESERVED:
      firstRequest?.query?.start === '2026-08-01' &&
      firstRequest?.query?.end === '2026-08-31',

    LIMIT_AND_SORT_PRESERVED:
      firstRequest?.query?.limit === 100 &&
      firstRequest?.query?.sort === 'asc',

    FIRST_PAGE_NORMALIZED:
      firstPage.actions.length === 2,

    REVERSE_SPLIT_NORMALIZED:
      firstPage.actions[0]?.id === 'ca-1' &&
      firstPage.actions[0]?.type === 'reverse_split' &&
      firstPage.actions[0]?.symbol === 'AAPL' &&
      firstPage.actions[0]?.processDate?.toISOString() ===
        '2026-08-01T00:00:00.000Z',

    CASH_DIVIDEND_NORMALIZED:
      firstPage.actions[1]?.id === 'ca-2' &&
      firstPage.actions[1]?.type === 'cash_dividend' &&
      firstPage.actions[1]?.symbol === 'MSFT',

    RAW_PAYLOAD_PRESERVED:
      firstPage.actions[0]?.raw?.old_rate === '1' &&
      firstPage.actions[0]?.raw?.new_rate === '4',

    NEXT_PAGE_TOKEN_PRESERVED:
      firstPage.nextPageToken === 'page-2',

    PAGINATION_COLLECTS_ALL:
      all.complete === true &&
      all.pagesFetched === 2 &&
      all.items.length === 4,

    REORGANIZATION_SUPPORTED:
      all.items.some(
        (item) =>
          item.id === 'ca-4' &&
          item.type === 'reorganization',
      ),

    INVALID_LIMIT_REJECTED:
      invalidLimitRejected,

    DUPLICATE_SYMBOLS_REJECTED:
      duplicateSymbolsRejected,

    DUPLICATE_TYPES_REJECTED:
      duplicateTypesRejected,

    INVALID_DATE_REJECTED:
      invalidDateRejected,

    INVERTED_RANGE_REJECTED:
      invertedRangeRejected,

    IDS_COMBINED_WITH_FILTERS_REJECTED:
      idsCombinedWithFiltersRejected,
  };

  for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
  }

  assert.ok(
    Object.values(assertions).every(Boolean),
    'Una o más verificaciones del punto 169 fallaron',
  );

  console.log('PUNTO 169 VERIFICADO CORRECTAMENTE.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});