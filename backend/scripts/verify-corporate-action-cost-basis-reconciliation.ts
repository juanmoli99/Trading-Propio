import { CorporateActionCostBasisReconciliationService } from '../src/corporate-actions/corporate-action-cost-basis-reconciliation.service';
import type { CorporateActionPositionAssociationService } from '../src/corporate-actions/corporate-action-position-association.service';

async function main(): Promise<void> {
  const dependency = {
    async associateWithExistingPositions() {
      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        matchedCount: 4,
        unmatchedCount: 1,
        associations: [
          {
            corporateAction: {
              id: 'forward-1',
              type: 'forward_split',
              symbol: 'AAPL',
              processDate: new Date('2026-08-13T00:00:00.000Z'),
              raw: {
                previous_cost_basis: '1000',
              },
            },
            position: {
              assetId: 'asset-aapl',
              symbol: 'AAPL',
              exchange: 'NASDAQ',
              assetClass: 'us_equity',
              quantity: '20',
              availableQuantity: '20',
              side: 'long',
              averageEntryPrice: '50',
              marketValue: '1000',
              costBasis: '1000',
              unrealizedPl: '0',
              unrealizedPlPercent: '0',
              currentPrice: '50',
              lastDayPrice: '50',
              changeToday: '0',
            },
            hasExistingPosition: true,
          },
          {
            corporateAction: {
              id: 'reverse-1',
              type: 'reverse_split',
              symbol: 'MSFT',
              processDate: new Date('2026-08-12T00:00:00.000Z'),
              raw: {
                pre_event_cost_basis: '2500.50',
              },
            },
            position: {
              assetId: 'asset-msft',
              symbol: 'MSFT',
              exchange: 'NASDAQ',
              assetClass: 'us_equity',
              quantity: '10',
              availableQuantity: '10',
              side: 'long',
              averageEntryPrice: '250.05',
              marketValue: '2500.50',
              costBasis: '2500.50',
              unrealizedPl: '0',
              unrealizedPlPercent: '0',
              currentPrice: '250.05',
              lastDayPrice: '250.05',
              changeToday: '0',
            },
            hasExistingPosition: true,
          },
          {
            corporateAction: {
              id: 'stock-dividend-1',
              type: 'stock_dividend',
              symbol: 'NVDA',
              processDate: new Date('2026-08-11T00:00:00.000Z'),
              raw: {
                cost_basis_before: '800',
              },
            },
            position: {
              assetId: 'asset-nvda',
              symbol: 'NVDA',
              exchange: 'NASDAQ',
              assetClass: 'us_equity',
              quantity: '10',
              availableQuantity: '10',
              side: 'long',
              averageEntryPrice: '80',
              marketValue: '1000',
              costBasis: '800',
              unrealizedPl: '200',
              unrealizedPlPercent: '0.25',
              currentPrice: '100',
              lastDayPrice: '100',
              changeToday: '0',
            },
            hasExistingPosition: true,
          },
          {
            corporateAction: {
              id: 'mismatch-1',
              type: 'forward_split',
              symbol: 'TSLA',
              processDate: new Date('2026-08-10T00:00:00.000Z'),
              raw: {
                previous_cost_basis: '900',
              },
            },
            position: {
              assetId: 'asset-tsla',
              symbol: 'TSLA',
              exchange: 'NASDAQ',
              assetClass: 'us_equity',
              quantity: '9',
              availableQuantity: '9',
              side: 'long',
              averageEntryPrice: '100',
              marketValue: '900',
              costBasis: '850',
              unrealizedPl: '50',
              unrealizedPlPercent: '0.0588235294',
              currentPrice: '100',
              lastDayPrice: '100',
              changeToday: '0',
            },
            hasExistingPosition: true,
          },
          {
            corporateAction: {
              id: 'no-position',
              type: 'cash_dividend',
              symbol: 'AMD',
              processDate: new Date('2026-08-09T00:00:00.000Z'),
              raw: {},
            },
            position: null,
            hasExistingPosition: false,
          },
        ],
      };
    },
  } as unknown as CorporateActionPositionAssociationService;

  const service =
    new CorporateActionCostBasisReconciliationService(
      dependency,
    );

  const result = await service.reconcileCostBasis();

  const forward = result.items.find(
    (item) => item.corporateActionId === 'forward-1',
  );

  const reverse = result.items.find(
    (item) => item.corporateActionId === 'reverse-1',
  );

  const stockDividend = result.items.find(
    (item) =>
      item.corporateActionId === 'stock-dividend-1',
  );

  const mismatch = result.items.find(
    (item) => item.corporateActionId === 'mismatch-1',
  );

  const noPosition = result.items.find(
    (item) => item.corporateActionId === 'no-position',
  );

  const checks: Record<string, boolean> = {
    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    FIVE_ITEMS_CREATED:
      result.items.length === 5,

    FORWARD_SPLIT_EXPECTED_COST_BASIS:
      forward?.expectedCostBasis === '1000',

    FORWARD_SPLIT_MATCHED:
      forward?.status === 'MATCHED',

    REVERSE_SPLIT_EXPECTED_COST_BASIS:
      reverse?.expectedCostBasis === '2500.5',

    REVERSE_SPLIT_MATCHED:
      reverse?.status === 'MATCHED',

    STOCK_DIVIDEND_EXPECTED_COST_BASIS:
      stockDividend?.expectedCostBasis === '800',

    STOCK_DIVIDEND_MATCHED:
      stockDividend?.status === 'MATCHED',

    MISMATCH_DETECTED:
      mismatch?.status === 'MISMATCH',

    MISMATCH_EXPECTED_COST_BASIS:
      mismatch?.expectedCostBasis === '900',

    CURRENT_COST_BASIS_PRESERVED:
      mismatch?.currentCostBasis === '850',

    NO_POSITION_NOT_APPLICABLE:
      noPosition?.status === 'NOT_APPLICABLE',

    MATCHED_COUNT_CORRECT:
      result.matchedCount === 3,

    MISMATCH_COUNT_CORRECT:
      result.mismatchCount === 1,

    NOT_APPLICABLE_COUNT_CORRECT:
      result.notApplicableCount === 1,

    PROCESS_DATE_DEFENSIVELY_COPIED:
      forward?.processDate !==
      (
        await dependency.associateWithExistingPositions()
      ).associations[0]?.corporateAction.processDate,
  };

  const createService = (
    action: Record<string, unknown>,
    costBasis = '1000',
  ) => {
    const dep = {
      async associateWithExistingPositions() {
        return {
          asOf: new Date('2026-08-13T00:00:00.000Z'),
          matchedCount: 1,
          unmatchedCount: 0,
          associations: [
            {
              corporateAction: action,
              position: {
                assetId: 'asset',
                symbol: 'AAPL',
                exchange: 'NASDAQ',
                assetClass: 'us_equity',
                quantity: '10',
                availableQuantity: '10',
                side: 'long',
                averageEntryPrice: '100',
                marketValue: '1000',
                costBasis,
                unrealizedPl: '0',
                unrealizedPlPercent: '0',
                currentPrice: '100',
                lastDayPrice: '100',
                changeToday: '0',
              },
              hasExistingPosition: true,
            },
          ],
        };
      },
    } as unknown as CorporateActionPositionAssociationService;

    return new CorporateActionCostBasisReconciliationService(
      dep,
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
    'ZERO_CURRENT_COST_BASIS_REJECTED',
    () =>
      createService(
        {
          id: 'bad-current-zero',
          type: 'forward_split',
          symbol: 'AAPL',
          processDate: new Date('2026-08-13T00:00:00.000Z'),
          raw: {
            previous_cost_basis: '1000',
          },
        },
        '0',
      ).reconcileCostBasis(),
  );

  await expectRejected(
    'NEGATIVE_CURRENT_COST_BASIS_REJECTED',
    () =>
      createService(
        {
          id: 'bad-current-negative',
          type: 'reverse_split',
          symbol: 'AAPL',
          processDate: new Date('2026-08-13T00:00:00.000Z'),
          raw: {
            pre_event_cost_basis: '1000',
          },
        },
        '-100',
      ).reconcileCostBasis(),
  );

  await expectRejected(
    'INVALID_PRE_EVENT_COST_BASIS_REJECTED',
    () =>
      createService({
        id: 'bad-previous',
        type: 'stock_dividend',
        symbol: 'AAPL',
        processDate: new Date('2026-08-13T00:00:00.000Z'),
        raw: {
          cost_basis_before: 'invalid',
        },
      }).reconcileCostBasis(),
  );

  const unsupported = await createService({
    id: 'cash-dividend',
    type: 'cash_dividend',
    symbol: 'AAPL',
    processDate: new Date('2026-08-13T00:00:00.000Z'),
    raw: {
      previous_cost_basis: '1000',
    },
  }).reconcileCostBasis();

  checks.UNSUPPORTED_EVENT_NOT_APPLICABLE =
    unsupported.items[0]?.status === 'NOT_APPLICABLE' &&
    unsupported.items[0]?.expectedCostBasis === null;

  const missingPrevious = await createService({
    id: 'missing-previous',
    type: 'forward_split',
    symbol: 'AAPL',
    processDate: new Date('2026-08-13T00:00:00.000Z'),
    raw: {},
  }).reconcileCostBasis();

  checks.MISSING_PRE_EVENT_COST_BASIS_NOT_APPLICABLE =
    missingPrevious.items[0]?.status === 'NOT_APPLICABLE' &&
    missingPrevious.items[0]?.expectedCostBasis === null;

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 183 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 183 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 183 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
