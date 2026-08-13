import { CorporateActionWorthlessRemovalService } from '../src/corporate-actions/corporate-action-worthless-removal.service';
import type { CorporateActionsService } from '../src/corporate-actions/corporate-actions.service';

async function main(): Promise<void> {
  let capturedQuery: any = null;
  const processDate = new Date('2026-07-15T00:00:00.000Z');
  const raw = { reason: 'worthless', marker: 1 };

  const dependency = {
    async getAllCorporateActions(query: Record<string, unknown>) {
      capturedQuery = query;
      return {
        items: [
          {
            id: 'worthless-1',
            type: 'worthless_removal',
            symbol: 'AAPL',
            processDate,
            raw,
          },
          {
            id: 'ignored',
            type: 'redemption',
            symbol: 'AAPL',
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

  const service = new CorporateActionWorthlessRemovalService(dependency);

  const result = await service.getWorthlessRemovals({
    symbol: ' aapl ',
    start: '2026-01-01',
    end: '2026-12-31',
  });

  const removal = result.removals[0];

  const checks: Record<string, boolean> = {
    SYMBOL_NORMALIZED: result.symbol === 'AAPL',
    QUERY_SCOPED_TO_WORTHLESS_REMOVAL:
      Array.isArray(capturedQuery?.types) &&
      capturedQuery.types.length === 1 &&
      capturedQuery.types[0] === 'worthless_removal',
    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(capturedQuery?.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'AAPL',
    DATE_FILTERS_PRESERVED:
      capturedQuery?.start === '2026-01-01' &&
      capturedQuery?.end === '2026-12-31',
    SORT_ASC_USED: capturedQuery?.sort === 'asc',
    ONLY_WORTHLESS_REMOVALS_INCLUDED:
      result.removals.length === 1 &&
      removal?.id === 'worthless-1',
    REMOVAL_SYMBOL_NORMALIZED: removal?.symbol === 'AAPL',
    PROCESS_DATE_PRESERVED:
      removal?.processDate.toISOString() ===
      '2026-07-15T00:00:00.000Z',
    RAW_PAYLOAD_PRESERVED:
      removal?.raw.reason === 'worthless' &&
      removal?.raw.marker === 1,
    PROCESS_DATE_DEFENSIVELY_COPIED:
      removal?.processDate !== processDate,
    RAW_PAYLOAD_DEFENSIVELY_COPIED:
      removal?.raw !== raw,
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
    () => service.getWorthlessRemovals({ symbol: '   ' }),
  );

  const createServiceForItem = (
    item: Record<string, unknown>,
  ): CorporateActionWorthlessRemovalService => {
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

    return new CorporateActionWorthlessRemovalService(dep);
  };

  const baseItem = {
    id: 'invalid-test',
    type: 'worthless_removal',
    symbol: 'AAPL',
    processDate: new Date('2026-07-15T00:00:00.000Z'),
    raw: { marker: 1 },
  };

  await expectRejected(
    'MISSING_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        symbol: null,
      }).getWorthlessRemovals({ symbol: 'AAPL' }),
  );

  await expectRejected(
    'MISSING_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        processDate: null,
      }).getWorthlessRemovals({ symbol: 'AAPL' }),
  );

  await expectRejected(
    'INVALID_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        processDate: new Date(Number.NaN),
      }).getWorthlessRemovals({ symbol: 'AAPL' }),
  );

  await expectRejected(
    'INVALID_ID_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        id: '   ',
      }).getWorthlessRemovals({ symbol: 'AAPL' }),
  );

  await expectRejected(
    'INVALID_RAW_PAYLOAD_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: [],
      }).getWorthlessRemovals({ symbol: 'AAPL' }),
  );

  const first = await service.getWorthlessRemovals({ symbol: 'AAPL' });
  const firstRaw = first.removals[0]?.raw as Record<string, unknown>;
  firstRaw.marker = 999;

  const second = await service.getWorthlessRemovals({ symbol: 'AAPL' });
  checks.RAW_PAYLOAD_MUTATION_ISOLATED =
    second.removals[0]?.raw.marker === 1;

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(`PUNTO 177 FALLO: ${failed.join(', ')}`);
  }

  console.log('PUNTO 177 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log('PUNTO 177 VERIFICADO CORRECTAMENTE.');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
