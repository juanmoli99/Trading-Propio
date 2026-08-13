import { CorporateActionEffectiveService } from '../src/corporate-actions/corporate-action-effective.service';
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
            symbol: ' aapl ',
            processDate: new Date('2026-08-13T00:00:00.000Z'),
            raw: { marker: 'same' },
          },
          {
            id: 'future',
            type: 'name_change',
            symbol: 'AAPL',
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

  const service = new CorporateActionEffectiveService(dependency);

  const asOf = new Date('2026-08-13T15:30:00.000Z');

  const result = await service.getEffectiveActions({
    symbols: ['AAPL'],
    types: ['cash_dividend', 'forward_split', 'name_change'],
    asOf,
    start: '2026-01-01',
  });

  const checks: Record<string, boolean> = {
    AS_OF_NORMALIZED_TO_UTC_DAY:
      result.asOf.toISOString() === '2026-08-13T00:00:00.000Z',

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf !== asOf,

    QUERY_END_DERIVED_FROM_AS_OF:
      capturedQuery?.end === '2026-08-13',

    QUERY_START_PRESERVED:
      capturedQuery?.start === '2026-01-01',

    QUERY_SYMBOLS_PRESERVED:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'AAPL',

    QUERY_TYPES_PRESERVED:
      Array.isArray(capturedQuery?.types) &&
      capturedQuery.types.length === 3,

    SORT_ASC_USED:
      capturedQuery?.sort === 'asc',

    PAST_EVENT_EFFECTIVE:
      result.effective.some((item) => item.id === 'past'),

    SAME_DAY_EVENT_EFFECTIVE:
      result.effective.some((item) => item.id === 'same-day'),

    FUTURE_EVENT_NOT_EFFECTIVE:
      !result.effective.some((item) => item.id === 'future'),

    EXACTLY_TWO_EFFECTIVE:
      result.effective.length === 2,

    SYMBOL_NORMALIZED:
      result.effective.find((item) => item.id === 'same-day')?.symbol === 'AAPL',

    PROCESS_DATE_PRESERVED:
      result.effective.find((item) => item.id === 'same-day')
        ?.processDate.toISOString() === '2026-08-13T00:00:00.000Z',

    RAW_PAYLOAD_PRESERVED:
      result.effective.find((item) => item.id === 'past')
        ?.raw.marker === 'past',
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
      service.getEffectiveActions({
        asOf: new Date(Number.NaN),
      }),
  );

  const createServiceForItem = (
    item: Record<string, unknown>,
  ): CorporateActionEffectiveService => {
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

    return new CorporateActionEffectiveService(dep);
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
      }).getEffectiveActions({
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
      }).getEffectiveActions({
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
        processDate: new Date('2026-08-12T00:00:00.000Z'),
        raw: {},
      }).getEffectiveActions({
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
        processDate: new Date('2026-08-12T00:00:00.000Z'),
        raw: {},
      }).getEffectiveActions({
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
        processDate: new Date('2026-08-12T00:00:00.000Z'),
        raw: [],
      }).getEffectiveActions({
        asOf: new Date('2026-08-13T00:00:00.000Z'),
      }),
  );

  const first = await service.getEffectiveActions({
    asOf: new Date('2026-08-13T00:00:00.000Z'),
  });

  const firstRaw = first.effective[0]?.raw as Record<string, unknown>;

  if (firstRaw) {
    firstRaw.marker = 'mutated';
  }

  const second = await service.getEffectiveActions({
    asOf: new Date('2026-08-13T00:00:00.000Z'),
  });

  checks.RAW_PAYLOAD_MUTATION_ISOLATED =
    second.effective[0]?.raw.marker === 'past';

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(`PUNTO 179 FALLO: ${failed.join(', ')}`);
  }

  console.log('PUNTO 179 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log('PUNTO 179 VERIFICADO CORRECTAMENTE.');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
