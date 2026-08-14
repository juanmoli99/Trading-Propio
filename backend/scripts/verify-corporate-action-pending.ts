import { CorporateActionPendingService } from '../src/corporate-actions/corporate-action-pending.service';
import type { CorporateActionsService } from '../src/corporate-actions/corporate-actions.service';

async function main(): Promise<void> {
  let capturedQuery: any = null;

  const dependency = {
    async getAllCorporateActions(query: Record<string, unknown>) {
      capturedQuery = query;

      return {
        items: [
          {
            id: 'past',
            type: 'cash_dividend',
            symbol: 'AAPL',
            processDate: new Date('2026-08-12T00:00:00.000Z'),
            raw: { marker: 'past' },
          },
          {
            id: 'same-day',
            type: 'forward_split',
            symbol: 'AAPL',
            processDate: new Date('2026-08-13T00:00:00.000Z'),
            raw: { marker: 'same' },
          },
          {
            id: 'future',
            type: 'name_change',
            symbol: ' aapl ',
            processDate: new Date('2026-08-14T00:00:00.000Z'),
            raw: { marker: 'future' },
          },
        ],
        pagesFetched: 1,
        complete: true,
        nextPageToken: null,
      };
    },
  } as unknown as CorporateActionsService;

  const service = new CorporateActionPendingService(dependency);

  const asOf = new Date('2026-08-13T15:30:00.000Z');

  const result = await service.getPendingActions({
    symbols: ['AAPL'],
    types: ['cash_dividend', 'forward_split', 'name_change'],
    asOf,
    end: '2026-12-31',
  });

  const pending = result.pending[0];

  const checks: Record<string, boolean> = {
    AS_OF_NORMALIZED_TO_UTC_DAY:
      result.asOf.toISOString() === '2026-08-13T00:00:00.000Z',

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf !== asOf,

    QUERY_START_DERIVED_FROM_AS_OF:
      capturedQuery?.start === '2026-08-13',

    QUERY_END_PRESERVED:
      capturedQuery?.end === '2026-12-31',

    QUERY_SYMBOLS_PRESERVED:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'AAPL',

    QUERY_TYPES_PRESERVED:
      Array.isArray(capturedQuery?.types) &&
      capturedQuery.types.length === 3,

    SORT_ASC_USED:
      capturedQuery?.sort === 'asc',

    ONLY_FUTURE_EVENT_PENDING:
      result.pending.length === 1 &&
      pending?.id === 'future',

    SAME_DAY_NOT_PENDING:
      !result.pending.some((item) => item.id === 'same-day'),

    PAST_EVENT_NOT_PENDING:
      !result.pending.some((item) => item.id === 'past'),

    SYMBOL_NORMALIZED:
      pending?.symbol === 'AAPL',

    PROCESS_DATE_PRESERVED:
      pending?.processDate.toISOString() ===
      '2026-08-14T00:00:00.000Z',

    RAW_PAYLOAD_PRESERVED:
      pending?.raw.marker === 'future',
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
    'INVALID_REFERENCE_TIMESTAMP_REJECTED',
    () =>
      service.getPendingActions({
        asOf: new Date(Number.NaN),
      }),
  );

  const createServiceForItem = (
    item: Record<string, unknown>,
  ): CorporateActionPendingService => {
    const dep = {
      async getAllCorporateActions() {
        return {
          items: [item],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    } as unknown as CorporateActionsService;

    return new CorporateActionPendingService(dep);
  };

  await expectRejected(
    'MISSING_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        id: 'missing-date',
        type: 'cash_dividend',
        symbol: 'AAPL',
        processDate: null,
        raw: {},
      }).getPendingActions({
        asOf: new Date('2026-08-13T00:00:00.000Z'),
      }),
  );

  await expectRejected(
    'INVALID_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        id: 'invalid-date',
        type: 'cash_dividend',
        symbol: 'AAPL',
        processDate: new Date(Number.NaN),
        raw: {},
      }).getPendingActions({
        asOf: new Date('2026-08-13T00:00:00.000Z'),
      }),
  );

  await expectRejected(
    'INVALID_ID_REJECTED',
    () =>
      createServiceForItem({
        id: '   ',
        type: 'cash_dividend',
        symbol: 'AAPL',
        processDate: new Date('2026-08-14T00:00:00.000Z'),
        raw: {},
      }).getPendingActions({
        asOf: new Date('2026-08-13T00:00:00.000Z'),
      }),
  );

  await expectRejected(
    'INVALID_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        id: 'bad-symbol',
        type: 'cash_dividend',
        symbol: 'A APL',
        processDate: new Date('2026-08-14T00:00:00.000Z'),
        raw: {},
      }).getPendingActions({
        asOf: new Date('2026-08-13T00:00:00.000Z'),
      }),
  );

  await expectRejected(
    'INVALID_RAW_PAYLOAD_REJECTED',
    () =>
      createServiceForItem({
        id: 'bad-raw',
        type: 'cash_dividend',
        symbol: 'AAPL',
        processDate: new Date('2026-08-14T00:00:00.000Z'),
        raw: [],
      }).getPendingActions({
        asOf: new Date('2026-08-13T00:00:00.000Z'),
      }),
  );

  const first = await service.getPendingActions({
    asOf: new Date('2026-08-13T00:00:00.000Z'),
  });

  const firstRaw = first.pending[0]?.raw as Record<string, unknown>;

  if (firstRaw) {
    firstRaw.marker = 'mutated';
  }

  const second = await service.getPendingActions({
    asOf: new Date('2026-08-13T00:00:00.000Z'),
  });

  checks.RAW_PAYLOAD_MUTATION_ISOLATED =
    second.pending[0]?.raw.marker === 'future';

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(`PUNTO 178 FALLO: ${failed.join(', ')}`);
  }

  console.log('PUNTO 178 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log('PUNTO 178 VERIFICADO CORRECTAMENTE.');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
