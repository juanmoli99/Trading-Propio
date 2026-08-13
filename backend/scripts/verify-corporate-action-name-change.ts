import { CorporateActionNameChangeService } from '../src/corporate-actions/corporate-action-name-change.service';
import type { CorporateActionsService } from '../src/corporate-actions/corporate-actions.service';

async function main(): Promise<void> {
  let capturedQuery: Record<string, unknown> = {};

  const processDate =
    new Date('2026-07-15T00:00:00.000Z');

  const corporateActionsService = {
    async getAllCorporateActions(
      query: Record<string, unknown>,
    ) {
      capturedQuery = query;

      return {
        items: [
          {
            id: 'name-change-1',
            type: 'name_change',
            symbol: 'META',
            processDate,
            raw: {
              old_symbol: 'FB',
              new_symbol: 'META',
              old_name: 'Facebook Inc.',
              new_name: 'Meta Platforms Inc.',
            },
          },
          {
            id: 'cash-dividend-ignored',
            type: 'cash_dividend',
            symbol: 'META',
            processDate,
            raw: {
              rate: '0.50',
            },
          },
        ],
        pagesFetched: 1,
        complete: true,
        nextPageToken: null,
      };
    },
  } as unknown as CorporateActionsService;

  const service =
    new CorporateActionNameChangeService(
      corporateActionsService,
    );

  const result = await service.getNameChanges({
    symbol: ' meta ',
    start: '2026-01-01',
    end: '2026-12-31',
  });

  const change = result.changes[0];

  const checks: Record<string, boolean> = {
    SYMBOL_NORMALIZED:
      result.symbol === 'META',

    QUERY_SCOPED_TO_NAME_CHANGES:
      Array.isArray(capturedQuery.types) &&
      capturedQuery.types.length === 1 &&
      capturedQuery.types[0] === 'name_change',

    QUERY_SCOPED_TO_SYMBOL:
      Array.isArray(capturedQuery.symbols) &&
      capturedQuery.symbols.length === 1 &&
      capturedQuery.symbols[0] === 'META',

    DATE_FILTERS_PRESERVED:
      capturedQuery.start === '2026-01-01' &&
      capturedQuery.end === '2026-12-31',

    SORT_ASC_USED:
      capturedQuery.sort === 'asc',

    ONLY_NAME_CHANGES_INCLUDED:
      result.changes.length === 1 &&
      change?.id === 'name-change-1',

    OLD_SYMBOL_NORMALIZED:
      change?.oldSymbol === 'FB',

    NEW_SYMBOL_NORMALIZED:
      change?.newSymbol === 'META',

    OLD_NAME_PRESERVED:
      change?.oldName === 'Facebook Inc.',

    NEW_NAME_PRESERVED:
      change?.newName === 'Meta Platforms Inc.',

    SYMBOL_CHANGE_DETECTED:
      change?.symbolChanged === true,

    NAME_CHANGE_DETECTED:
      change?.nameChanged === true,

    PROCESS_DATE_PRESERVED:
      change?.processDate.toISOString() ===
      '2026-07-15T00:00:00.000Z',

    PROCESS_DATE_DEFENSIVELY_COPIED:
      change?.processDate !== processDate,
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
      service.getNameChanges({
        symbol: '   ',
      }),
  );

  const createServiceForItem = (
    item: Record<string, unknown>,
  ): CorporateActionNameChangeService => {
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

    return new CorporateActionNameChangeService(
      dependency,
    );
  };

  const baseItem = {
    id: 'invalid-test',
    type: 'name_change',
    symbol: 'META',
    processDate: new Date(
      '2026-07-15T00:00:00.000Z',
    ),
    raw: {
      old_symbol: 'FB',
      new_symbol: 'META',
      old_name: 'Facebook Inc.',
      new_name: 'Meta Platforms Inc.',
    },
  };

  await expectRejected(
    'MISSING_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        symbol: null,
      }).getNameChanges({
        symbol: 'META',
      }),
  );

  await expectRejected(
    'MISSING_PROCESS_DATE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        processDate: null,
      }).getNameChanges({
        symbol: 'META',
      }),
  );

  await expectRejected(
    'MISSING_OLD_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: {
          ...baseItem.raw,
          old_symbol: null,
        },
      }).getNameChanges({
        symbol: 'META',
      }),
  );

  await expectRejected(
    'MISSING_NEW_SYMBOL_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: {
          ...baseItem.raw,
          new_symbol: null,
        },
      }).getNameChanges({
        symbol: 'META',
      }),
  );

  await expectRejected(
    'INVALID_OLD_NAME_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: {
          ...baseItem.raw,
          old_name: '   ',
        },
      }).getNameChanges({
        symbol: 'META',
      }),
  );

  await expectRejected(
    'INVALID_NEW_NAME_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: {
          ...baseItem.raw,
          new_name: 123,
        },
      }).getNameChanges({
        symbol: 'META',
      }),
  );

  await expectRejected(
    'NO_EFFECTIVE_CHANGE_REJECTED',
    () =>
      createServiceForItem({
        ...baseItem,
        raw: {
          old_symbol: 'META',
          new_symbol: 'META',
          old_name: 'Meta Platforms Inc.',
          new_name: 'Meta Platforms Inc.',
        },
      }).getNameChanges({
        symbol: 'META',
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
      `PUNTO 173 FALLÓ: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 173 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 173 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });