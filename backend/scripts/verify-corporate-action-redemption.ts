import { CorporateActionRedemptionService } from '../src/corporate-actions/corporate-action-redemption.service';
import type { CorporateActionsService } from '../src/corporate-actions/corporate-actions.service';

async function main(): Promise<void> {
  let capturedQuery: Record<string, unknown> | null = null;

  const processDate = new Date('2026-07-15T00:00:00.000Z');
  const rawPayload = {
    id: 'redemption-1',
    symbol: 'AAPL',
    process_date: '2026-07-15',
    rate: '25.50',
  };

  const corporateActionsService = {
    async getAllCorporateActions(
      query: Record<string, unknown>,
    ) {
      capturedQuery = query;

      return {
        items: [
          {
            id: ' redemption-1 ',
            type: 'redemption',
            symbol: ' aapl ',
            processDate,
            raw: rawPayload,
          },
          {
            id: 'ignored-split',
            type: 'forward_split',
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

  const service = new CorporateActionRedemptionService(
    corporateActionsService,
  );

  const result = await service.getRedemptions({
    symbol: ' aapl ',
    start: '2026-01-01',
    end: '2026-12-31',
  });

  const redemption = result.redemptions[0];
  const query = capturedQuery as Record<string, unknown> | null;

  const checks: Record<string, boolean> = {
    SYMBOL_NORMALIZED:
      result.symbol === 'AAPL',

    QUERY_SCOPED_TO_REDEMPTIONS:
      Array.isArray(query?.types) &&
      query.types.length === 1 &&
      query.types[0] === 'redemption',

    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(query?.symbols) &&
      query.symbols.length === 1 &&
      query.symbols[0] === 'AAPL',

    DATE_FILTERS_PRESERVED:
      query?.start === '2026-01-01' &&
      query?.end === '2026-12-31',

    SORT_ASC_USED:
      query?.sort === 'asc',

    ONLY_REDEMPTIONS_INCLUDED:
      result.redemptions.length === 1 &&
      redemption?.id === 'redemption-1',

    REDEMPTION_SYMBOL_NORMALIZED:
      redemption?.symbol === 'AAPL',

    PROCESS_DATE_PRESERVED:
      redemption?.processDate.toISOString() ===
      '2026-07-15T00:00:00.000Z',

    RAW_PAYLOAD_PRESERVED:
      redemption?.raw.rate === '25.50',

    PROCESS_DATE_DEDENSIVELY_COPIED:
      redemption?.processDate !== processDate,

    RAW_PAYLOAD_DEDENSIVELY_COPIED:
      redemption?.raw !== rawPayload,
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
     () => service.getRedemptions({ symbol: '   ' }),
  );

  const createServiceForItem = (
    item: Record<string, unknown>,
  ): CorporateActionRedemptionService => {
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

    return new CorporateActionRedemptionService(dependency);
  };

  const baseItem = {
    id: 'redemption-test',
    type: 'redemption',
    symbol: 'AAPL',
    processDate: new Date('2026-07-15T00:00:00.000Z'),
    raw: { rate: '10' },
  };

  await expectRejected(
    'MISSING_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        symbol: null,
      }).getRedemptions({symbol: 'AAPL' }),
  );

  await expectRejected(
    'MISSING_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        processDate: null,
      }).getRedemptions({symbol: 'AAPL' }),
  );

  await expectRejected(
    'INVALID_ID_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        id: '   ',
      }).getRedemptions({symbol: 'AAPL' }),
  );

  await expectRejected(
    'INVALID_RAW_PAYLOAD_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: null,
      }).getRedemptions({symbol: 'AAPL' }),
  );

  const defensiveResult =
    await service.getRedemptions({ symbol: 'AAPL' });

  const firstRaw = defensiveResult.redemptions[0]?.raw as
    | Record<string, unknown>
    | undefined;

  if (firstRaw !== undefined) {
    firstRaw.rate = '999';

    const secondResult =
      await service.getRedemptions({symbol: 'AAPL' });

    checks.RAW_PAYLOAD_MUTATION_ISOLATED =
      secondResult.redemptions[0]?.raw.rate === '25.50';
  } else {
    checks.RAW_PAYLOAD_MUTATION_ISOLATED = false;
  }

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 176 FALLÃ“: ${failed.join(', ')}`,
    );
  }

  console.log('PUNTO 176 VERIFICADO CORRECTAMENTE.');
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log('PUNTO 176 VERIFICADO CORRECTAMENTE.');
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
