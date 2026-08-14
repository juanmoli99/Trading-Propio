import { CorporateActionPostEventReconciliationService } from '../src/corporate-actions/corporate-action-post-event-reconciliation.service';
import type { CorporateActionQuantityReconciliationService } from '../src/corporate-actions/corporate-action-quantity-reconciliation.service';
import type { CorporateActionCostBasisReconciliationService } from '../src/corporate-actions/corporate-action-cost-basis-reconciliation.service';

async function main(): Promise<void> {
  let quantityQuery: any = null;
  let costBasisQuery: any = null;

  const quantityService = {
    async reconcileQuantity(query: Record<string, unknown>) {
      quantityQuery = query;

      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        items: [
          {
            corporateActionId: 'matched',
            corporateActionType: 'forward_split',
            symbol: ' aapl ',
            processDate: new Date('2026-08-10T00:00:00.000Z'),
            currentQuantity: '20',
            expectedQuantity: '20',
            quantityFactor: 2,
            status: 'MATCHED',
            reason: 'Quantity matched',
          },
          {
            corporateActionId: 'mismatch',
            corporateActionType: 'reverse_split',
            symbol: 'MSFT',
            processDate: new Date('2026-08-11T00:00:00.000Z'),
            currentQuantity: '8',
            expectedQuantity: '10',
            quantityFactor: 0.5,
            status: 'MISMATCH',
            reason: 'Quantity mismatch',
          },
          {
            corporateActionId: 'not-applicable',
            corporateActionType: 'cash_dividend',
            symbol: null,
            processDate: new Date('2026-08-12T00:00:00.000Z'),
            currentQuantity: null,
            expectedQuantity: null,
            quantityFactor: null,
            status: 'NOT_APPLICABLE',
            reason: 'Quantity not applicable',
          },
          {
            corporateActionId: 'partial-match',
            corporateActionType: 'stock_dividend',
            symbol: 'NVDA',
            processDate: new Date('2026-08-12T00:00:00.000Z'),
            currentQuantity: '11',
            expectedQuantity: '11',
            quantityFactor: 1.1,
            status: 'MATCHED',
            reason: 'Quantity matched',
          },
        ],
        matchedCount: 2,
        mismatchCount: 1,
        notApplicableCount: 1,
      };
    },
  } as unknown as CorporateActionQuantityReconciliationService;

  const costBasisService = {
    async reconcileCostBasis(query: Record<string, unknown>) {
      costBasisQuery = query;

      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        items: [
          {
            corporateActionId: 'matched',
            corporateActionType: 'forward_split',
            symbol: 'AAPL',
            processDate: new Date('2026-08-10T00:00:00.000Z'),
            currentCostBasis: '1000',
            expectedCostBasis: '1000',
            status: 'MATCHED',
            reason: 'Cost basis matched',
          },
          {
            corporateActionId: 'mismatch',
            corporateActionType: 'reverse_split',
            symbol: 'MSFT',
            processDate: new Date('2026-08-11T00:00:00.000Z'),
            currentCostBasis: '900',
            expectedCostBasis: '1000',
            status: 'MATCHED',
            reason: 'Cost basis matched',
          },
          {
            corporateActionId: 'not-applicable',
            corporateActionType: 'cash_dividend',
            symbol: null,
            processDate: new Date('2026-08-12T00:00:00.000Z'),
            currentCostBasis: null,
            expectedCostBasis: null,
            status: 'NOT_APPLICABLE',
            reason: 'Cost basis not applicable',
          },
          {
            corporateActionId: 'partial-match',
            corporateActionType: 'stock_dividend',
            symbol: 'NVDA',
            processDate: new Date('2026-08-12T00:00:00.000Z'),
            currentCostBasis: '500',
            expectedCostBasis: null,
            status: 'NOT_APPLICABLE',
            reason: 'Cost basis unavailable',
          },
        ],
        matchedCount: 2,
        mismatchCount: 0,
        notApplicableCount: 2,
      };
    },
  } as unknown as CorporateActionCostBasisReconciliationService;

  const service =
    new CorporateActionPostEventReconciliationService(
      quantityService,
      costBasisService,
    );

  const asOf = new Date('2026-08-13T15:30:00.000Z');

  const query = {
    symbols: ['AAPL', 'MSFT'],
    asOf,
    start: '2026-01-01',
  };

  const result = await service.reconcilePostEvent(query);

  const matched = result.items.find(
    (item) => item.corporateActionId === 'matched',
  );

  const mismatch = result.items.find(
    (item) => item.corporateActionId === 'mismatch',
  );

  const notApplicable = result.items.find(
    (item) => item.corporateActionId === 'not-applicable',
  );

  const partialMatch = result.items.find(
    (item) => item.corporateActionId === 'partial-match',
  );

  const checks: Record<string, boolean> = {
    QUERY_PASSED_TO_QUANTITY:
      quantityQuery === query,

    QUERY_PASSED_TO_COST_BASIS:
      costBasisQuery === query,

    FOUR_ITEMS_CREATED:
      result.items.length === 4,

    MATCHED_STATUS_CORRECT:
      matched?.status === 'MATCHED',

    MATCHED_QUANTITY_STATUS_PRESERVED:
      matched?.quantityStatus === 'MATCHED',

    MATCHED_COST_BASIS_STATUS_PRESERVED:
      matched?.costBasisStatus === 'MATCHED',

    SYMBOL_NORMALIZED:
      matched?.symbol === 'AAPL',

    MISMATCH_TAKES_PRECEDENCE:
      mismatch?.status === 'MISMATCH',

    MISMATCH_QUANTITY_STATUS_PRESERVED:
      mismatch?.quantityStatus === 'MISMATCH',

    MISMATCH_COST_BASIS_STATUS_PRESERVED:
      mismatch?.costBasisStatus === 'MATCHED',

    BOTH_NOT_APPLICABLE:
      notApplicable?.status === 'NOT_APPLICABLE',

    NULL_SYMBOL_PRESERVED:
      notApplicable?.symbol === null,

    PARTIAL_APPLICABILITY_COUNTS_AS_MATCHED:
      partialMatch?.quantityStatus === 'MATCHED' &&
      partialMatch?.costBasisStatus === 'NOT_APPLICABLE' &&
      partialMatch?.status === 'MATCHED',

    MATCHED_COUNT_CORRECT:
      result.matchedCount === 2,

    MISMATCH_COUNT_CORRECT:
      result.mismatchCount === 1,

    NOT_APPLICABLE_COUNT_CORRECT:
      result.notApplicableCount === 1,

    RECONCILIATION_FAILURE_ON_MISMATCH:
      result.reconciliationSuccessful === false,

    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    AS_OF_DEFENSIVELY_COPIED:
      result.asOf !== asOf,

    PROCESS_DATE_PRESERVED:
      matched?.processDate.toISOString() ===
      '2026-08-10T00:00:00.000Z',

    QUANTITY_REASON_PRESERVED:
      matched?.quantityReason === 'Quantity matched',

    COST_BASIS_REASON_PRESERVED:
      matched?.costBasisReason === 'Cost basis matched',
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

  const makeService = (
    quantityResult: any,
    costBasisResult: any,
  ) =>
    new CorporateActionPostEventReconciliationService(
      {
        async reconcileQuantity() {
          return quantityResult;
        },
      } as unknown as CorporateActionQuantityReconciliationService,
      {
        async reconcileCostBasis() {
          return costBasisResult;
        },
      } as unknown as CorporateActionCostBasisReconciliationService,
    );

  const validQuantityItem = {
    corporateActionId: 'x',
    corporateActionType: 'forward_split',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    currentQuantity: '20',
    expectedQuantity: '20',
    quantityFactor: 2,
    status: 'MATCHED',
    reason: 'ok',
  };

  const validCostBasisItem = {
    corporateActionId: 'x',
    corporateActionType: 'forward_split',
    symbol: 'AAPL',
    processDate: new Date('2026-08-10T00:00:00.000Z'),
    currentCostBasis: '1000',
    expectedCostBasis: '1000',
    status: 'MATCHED',
    reason: 'ok',
  };

  const baseQuantityResult = {
    asOf: new Date('2026-08-13T00:00:00.000Z'),
    items: [validQuantityItem],
    matchedCount: 1,
    mismatchCount: 0,
    notApplicableCount: 0,
  };

  const baseCostBasisResult = {
    asOf: new Date('2026-08-13T00:00:00.000Z'),
    items: [validCostBasisItem],
    matchedCount: 1,
    mismatchCount: 0,
    notApplicableCount: 0,
  };

  await expectRejected(
    'DIFFERENT_REFERENCE_DATES_REJECTED',
    () =>
      makeService(
        baseQuantityResult,
        {
          ...baseCostBasisResult,
          asOf: new Date('2026-08-14T00:00:00.000Z'),
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'INVALID_REFERENCE_DATE_REJECTED',
    () =>
      makeService(
        {
          ...baseQuantityResult,
          asOf: new Date(Number.NaN),
        },
        baseCostBasisResult,
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'MISSING_COST_BASIS_RESULT_REJECTED',
    () =>
      makeService(
        baseQuantityResult,
        {
          ...baseCostBasisResult,
          items: [],
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'MISSING_QUANTITY_RESULT_REJECTED',
    () =>
      makeService(
        {
          ...baseQuantityResult,
          items: [],
        },
        baseCostBasisResult,
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'DUPLICATE_QUANTITY_ID_REJECTED',
    () =>
      makeService(
        {
          ...baseQuantityResult,
          items: [
            validQuantityItem,
            { ...validQuantityItem },
          ],
        },
        baseCostBasisResult,
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'DUPLICATE_COST_BASIS_ID_REJECTED',
    () =>
      makeService(
        baseQuantityResult,
        {
          ...baseCostBasisResult,
          items: [
            validCostBasisItem,
            { ...validCostBasisItem },
          ],
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'INVALID_ID_REJECTED',
    () =>
      makeService(
        {
          ...baseQuantityResult,
          items: [
            {
              ...validQuantityItem,
              corporateActionId: '   ',
            },
          ],
        },
        {
          ...baseCostBasisResult,
          items: [
            {
              ...validCostBasisItem,
              corporateActionId: '   ',
            },
          ],
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'TYPE_MISMATCH_REJECTED',
    () =>
      makeService(
        baseQuantityResult,
        {
          ...baseCostBasisResult,
          items: [
            {
              ...validCostBasisItem,
              corporateActionType: 'reverse_split',
            },
          ],
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'SYMBOL_MISMATCH_REJECTED',
    () =>
      makeService(
        baseQuantityResult,
        {
          ...baseCostBasisResult,
          items: [
            {
              ...validCostBasisItem,
              symbol: 'MSFT',
            },
          ],
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'INVALID_SYMBOL_REJECTED',
    () =>
      makeService(
        {
          ...baseQuantityResult,
          items: [
            {
              ...validQuantityItem,
              symbol: 'BAD SYMBOL',
            },
          ],
        },
        {
          ...baseCostBasisResult,
          items: [
            {
              ...validCostBasisItem,
              symbol: 'BAD SYMBOL',
            },
          ],
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'PROCESS_DATE_MISMATCH_REJECTED',
    () =>
      makeService(
        baseQuantityResult,
        {
          ...baseCostBasisResult,
          items: [
            {
              ...validCostBasisItem,
              processDate: new Date(
                '2026-08-11T00:00:00.000Z',
              ),
            },
          ],
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'INVALID_PROCESS_DATE_REJECTED',
    () =>
      makeService(
        {
          ...baseQuantityResult,
          items: [
            {
              ...validQuantityItem,
              processDate: new Date(Number.NaN),
            },
          ],
        },
        {
          ...baseCostBasisResult,
          items: [
            {
              ...validCostBasisItem,
              processDate: new Date(Number.NaN),
            },
          ],
        },
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'EMPTY_QUANTITY_REASON_REJECTED',
    () =>
      makeService(
        {
          ...baseQuantityResult,
          items: [
            {
              ...validQuantityItem,
              reason: '   ',
            },
          ],
        },
        baseCostBasisResult,
      ).reconcilePostEvent(),
  );

  await expectRejected(
    'EMPTY_COST_BASIS_REASON_REJECTED',
    () =>
      makeService(
        baseQuantityResult,
        {
          ...baseCostBasisResult,
          items: [
            {
              ...validCostBasisItem,
              reason: '   ',
            },
          ],
        },
      ).reconcilePostEvent(),
  );

  const successResult =
    await makeService(
      baseQuantityResult,
      baseCostBasisResult,
    ).reconcilePostEvent();

  checks.RECONCILIATION_SUCCESS_WITHOUT_MISMATCH =
    successResult.reconciliationSuccessful === true &&
    successResult.mismatchCount === 0 &&
    successResult.matchedCount === 1;

  const firstRun =
    await service.reconcilePostEvent(query);

  const secondRun =
    await service.reconcilePostEvent(query);

  checks.REPEATED_RECONCILIATION_DETERMINISTIC =
    JSON.stringify(firstRun) ===
    JSON.stringify(secondRun);

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 190 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 190 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 190 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
