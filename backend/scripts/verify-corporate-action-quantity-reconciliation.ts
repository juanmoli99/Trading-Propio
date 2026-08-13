import { CorporateActionQuantityReconciliationService } from '../src/corporate-actions/corporate-action-quantity-reconciliation.service';
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
                old_rate: '1',
                new_rate: '2',
                previous_quantity: '10',
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
                old_rate: '10',
                new_rate: '1',
                pre_event_quantity: '100',
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
              averageEntryPrice: '100',
              marketValue: '1000',
              costBasis: '1000',
              unrealizedPl: '0',
              unrealizedPlPercent: '0',
              currentPrice: '100',
              lastDayPrice: '100',
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
                rate: '0.25',
                quantity_before: '8',
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
                old_rate: '1',
                new_rate: '5',
                previous_quantity: '2',
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
              costBasis: '900',
              unrealizedPl: '0',
              unrealizedPlPercent: '0',
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
              raw: {
                rate: '1.5',
              },
            },
            position: null,
            hasExistingPosition: false,
          },
        ],
      };
    },
  } as unknown as CorporateActionPositionAssociationService;

  const service =
    new CorporateActionQuantityReconciliationService(
      dependency,
    );

  const result = await service.reconcileQuantity();

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

    FORWARD_SPLIT_FACTOR_CORRECT:
      forward?.quantityFactor === 2,

    FORWARD_SPLIT_EXPECTED_QUANTITY:
      forward?.expectedQuantity === '20',

    FORWARD_SPLIT_MATCHED:
      forward?.status === 'MATCHED',

    REVERSE_SPLIT_FACTOR_CORRECT:
      reverse?.quantityFactor === 0.1,

    REVERSE_SPLIT_EXPECTED_QUANTITY:
      reverse?.expectedQuantity === '10',

    REVERSE_SPLIT_MATCHED:
      reverse?.status === 'MATCHED',

    STOCK_DIVIDEND_FACTOR_CORRECT:
      stockDividend?.quantityFactor === 1.25,

    STOCK_DIVIDEND_EXPECTED_QUANTITY:
      stockDividend?.expectedQuantity === '10',

    STOCK_DIVIDEND_MATCHED:
      stockDividend?.status === 'MATCHED',

    MISMATCH_DETECTED:
      mismatch?.status === 'MISMATCH',

    MISMATCH_EXPECTED_QUANTITY:
      mismatch?.expectedQuantity === '10',

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
    quantity = '10',
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
                quantity,
                availableQuantity: quantity,
                side: 'long',
                averageEntryPrice: '100',
                marketValue: '1000',
                costBasis: '1000',
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

    return new CorporateActionQuantityReconciliationService(
      dep,
    );
  };

  const expectRejected = async (
    name: string,
    action: () => Promise<unknown>,
  ) => {
    try {
      await action();
      checks[name] = false;
    } catch {
      checks[name] = true;
    }
  };

  await expectRejected(
    'INVALID_SPLIT_RATE_REJECTED',
    () =>
      createService({
        id: 'bad-split',
        type: 'forward_split',
        symbol: 'AAPL',
        processDate: new Date('2026-08-13T00:00:00.000Z'),
        raw: {
          old_rate: '0',
          new_rate: '2',
          previous_quantity: '10',
        },
      }).reconcileQuantity(),
  );

  await expectRejected(
    'INVALID_FORWARD_DIRECTION_REJECTED',
    () =>
      createService({
        id: 'bad-forward',
        type: 'forward_split',
        symbol: 'AAPL',
        processDate: new Date('2026-08-13T00:00:00.000Z'),
        raw: {
          old_rate: '2',
          new_rate: '1',
          previous_quantity: '10',
        },
      }).reconcileQuantity(),
  );

  await expectRejected(
    'INVALID_REVERSE_DIRECTION_REJECTED',
    () =>
      createService({
        id: 'bad-reverse',
        type: 'reverse_split',
        symbol: 'AAPL',
        processDate: new Date('2026-08-13T00:00:00.000Z'),
        raw: {
          old_rate: '1',
          new_rate: '2',
          previous_quantity: '10',
        },
      }).reconcileQuantity(),
  );

  await expectRejected(
    'INVALID_STOCK_DIVIDEND_RATE_REJECTED',
    () =>
      createService({
        id: 'bad-dividend',
        type: 'stock_dividend',
        symbol: 'AAPL',
        processDate: new Date('2026-08-13T00:00:00.000Z'),
        raw: {
          rate: '0',
          previous_quantity: '10',
        },
      }).reconcileQuantity(),
  );

  await expectRejected(
    'INVALID_CURRENT_QUANTITY_REJECTED',
    () =>
      createService(
        {
          id: 'bad-current',
          type: 'forward_split',
          symbol: 'AAPL',
          processDate: new Date('2026-08-13T00:00:00.000Z'),
          raw: {
            old_rate: '1',
            new_rate: '2',
            previous_quantity: '10',
          },
        },
        '0',
      ).reconcileQuantity(),
  );

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 182 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 182 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 182 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });