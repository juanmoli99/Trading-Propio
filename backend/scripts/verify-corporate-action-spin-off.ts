import { CorporateActionSpinOffService } from '../src/corporate-actions/corporate-action-spin-off.service';
import type { CorporateActionsService } from '../src/corporate-actions/corporate-actions.service';

async function main(): Promise<void> {
  let capturedQuery: Record<string, unknown> = {};

  const processDate = new Date('2026-09-15T00:00:00.000Z');

  const rawPayload = {
    symbol: 'ABC',
    process_date: '2026-09-15',
    target_symbol: 'NEW',
    rate: '0.50',
  };

  const corporateActionsService = {
    async getAllCorporateActions(
      query: Record<string, unknown>,
    ) {
      capturedQuery = query;

      return {
        items: [
          {
            id: 'spin-off-1',
            type: 'spin_off',
            symbol: 'ABC',
            processDate,
            raw: rawPayload,
          },
          {
            id: 'ignored-merger',
            type: 'cash_merger',
            symbol: 'ABC',
            processDate,
            raw: {},
          },
        ],
        pagesFetched: 1,
        complete: true,
        nextPageToken: null,
      };
    },
  } as unknown as CorporateActionsService;

  const service = new CorporateActionSpinOffService(
    corporateActionsService,
  );

  const result = await service.getSpinOffs({
    symbol: ' abc ',
    start: '2026-01-01',
    end: '2026-12-31',
  });

  const spinOff = result.spinOffs[0];

  const checks: Record<string, boolean> = {
    SYMBOL_NORMALIZED:
      result.symbol === 'ABC',

    QUERY_SCOPED_TO_SPIN_OFF:
      Array.isArray(capturedQuery.types) &&
      capturedQuery.types.length === 1 &&
      capturedQuery.types[0] === 'spin_off',

    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(capturedQuery.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'ABC',

    DATE_FILTERS_PRESERVED:
      capturedQuery.start === '2026-01-01' &&
      capturedQuery.end === '2026-12-31',

    SORT_ASC_USED:
      capturedQuery.sort === 'asc',

    ONLY_SPIN_OFFS_INCLUDED:
      result.spinOffs.length === 1 &&
      spinOff?.id === 'spin-off-1',

    SPIN_OFF_SYMBOL_NORMALIZED:
      spinOff?.symbol === 'ABC',

    PROCESS_DATE_PRESERVED:
      spinOff?.processDate.toISOString() ===
      '2026-09-15T00:00:00.000Z',

    RAW_PAYLOAD_PRESERVED:
      spinOff?.raw.target_symbol === 'NEW' &&
      spinOff?.raw.rate === '0.50',

    PROCESS_DATE_DEFENSIVELY_COPIED:
      spinOff?.processDate !== processDate,

    RAW_PAYLOAD_DEFENSIVELY_COPIED:
      spinOff?.raw !== rawPayload,
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
    'INVALID_SYMBOL_REJECTED',
    () =>
      service.getSpinOffs({
        symbol: '   ',
      }),
  );

  const createServiceForItem = (
    item: Record<string, unknown>,
  ): CorporateActionSpinOffService => {
    const dependency = {
      async getAllCorporateActions() {
        return {
          items: [item],
          pagesFetched: 1,
          complete: true,
          nextPageToken: null,
        };
      },
    } as unknown as CorporateActionsService;

    return new CorporateActionSpinOffService(
      dependency,
    );
  };

  const baseItem = {
    id: 'invalid-test',
    type: 'spin_off',
    symbol: 'ABC',
    processDate: new Date(
      '2026-09-15T00:00:00.000Z',
    ),
    raw: {
      target_symbol: 'NEW',
    },
  };

  await expectRejected(
    'MISSING_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        symbol: null,
      }).getSpinOffs({
        symbol: 'ABC',
      }),
  );

  await expectRejected(
    'MISSING_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        processDate: null,
      }).getSpinOffs({
        symbol: 'ABC',
      }),
  );

  await expectRejected(
    'INVALID_ID_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        id: '   ',
      }).getSpinOffs({
        symbol: 'ABC',
      }),
  );

  await expectRejected(
    'INVALID_RAW_PAYLOAD_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: null,
      }).getSpinOffs({
        symbol: 'ABC',
      }),
  );

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 175 FALLÃ“: ${failed.join(', ')}`,
    );
  }

  console.log('PUNTO 175 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log('PUNTO 175 VERIFICADO CORRECTAMENTE.');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
