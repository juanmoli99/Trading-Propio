import { CorporateActionPositionAssociationService } from '../src/corporate-actions/corporate-action-position-association.service';
import type { AlpacaPositionService } from '../src/alpaca/alpaca-position.service';
import type { CorporateActionEffectiveService } from '../src/corporate-actions/corporate-action-effective.service';

async function main(): Promise<void> {
  const effectiveService = {
    async getEffectiveActions() {
      return {
        asOf: new Date('2026-08-13T00:00:00.000Z'),
        effective: [
          {
            id: 'action-matched',
            type: 'forward_split',
            symbol: ' aapl ',
            processDate: new Date('2026-08-13T00:00:00.000Z'),
            raw: { marker: 'matched' },
          },
          {
            id: 'action-unmatched',
            type: 'cash_dividend',
            symbol: 'MSFT',
            processDate: new Date('2026-08-12T00:00:00.000Z'),
            raw: { marker: 'unmatched' },
          },
          {
            id: 'action-without-symbol',
            type: 'reorganization',
            symbol: null,
            processDate: new Date('2026-08-11T00:00:00.000Z'),
            raw: { marker: 'no-symbol' },
          },
        ],
      };
    },
  } as unknown as CorporateActionEffectiveService;

  const alpacaPosition = {
    assetId: 'asset-aapl',
    symbol: 'AAPL',
    exchange: 'NASDAQ',
    assetClass: 'us_equity',
    quantity: '10',
    availableQuantity: '10',
    side: 'long',
    averageEntryPrice: '100',
    marketValue: '1500',
    costBasis: '1000',
    unrealizedPl: '500',
    unrealizedPlPercent: '0.5',
    currentPrice: '150',
    lastDayPrice: '148',
    changeToday: '0.0135',
  };

  const positionService = {
    async getPositions() {
      return [alpacaPosition];
    },
  } as unknown as AlpacaPositionService;

  const service =
    new CorporateActionPositionAssociationService(
      effectiveService,
      positionService,
    );

  const result =
    await service.associateWithExistingPositions();

  const matched = result.associations.find(
    (item) =>
      item.corporateAction.id === 'action-matched',
  );

  const unmatched = result.associations.find(
    (item) =>
      item.corporateAction.id === 'action-unmatched',
  );

  const withoutSymbol = result.associations.find(
    (item) =>
      item.corporateAction.id === 'action-without-symbol',
  );

  const checks: Record<string, boolean> = {
    AS_OF_PRESERVED:
      result.asOf.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    THREE_ASSOCIATIONS_CREATED:
      result.associations.length === 3,

    MATCHED_COUNT_CORRECT:
      result.matchedCount === 1,

    UNMATCHED_COUNT_CORRECT:
      result.unmatchedCount === 2,

    MATCH_BY_SYMBOL:
      matched?.hasExistingPosition === true &&
      matched.position?.symbol === 'AAPL',

    POSITION_PRESERVED:
      matched?.position?.quantity === '10' &&
      matched.position.costBasis === '1000',

    UNMATCHED_POSITION_IS_NULL:
      unmatched?.hasExistingPosition === false &&
      unmatched.position === null,

    NULL_SYMBOL_NOT_ASSOCIATED:
      withoutSymbol?.hasExistingPosition === false &&
      withoutSymbol.position === null,

    ACTION_PRESERVED:
      matched?.corporateAction.type ===
      'forward_split',

    ACTION_PROCESS_DATE_PRESERVED:
      matched?.corporateAction.processDate.toISOString() ===
      '2026-08-13T00:00:00.000Z',

    RAW_PAYLOAD_PRESERVED:
      matched?.corporateAction.raw.marker ===
      'matched',

    ACTION_DEFENSIVELY_COPIED:
      matched?.corporateAction !==
      (
        await effectiveService.getEffectiveActions()
      ).effective[0],

    POSITION_DEFENSIVELY_COPIED:
      matched?.position !== alpacaPosition,
  };

  const duplicatePositionService = {
    async getPositions() {
      return [
        alpacaPosition,
        {
          ...alpacaPosition,
          assetId: 'asset-aapl-2',
          symbol: ' aapl ',
        },
      ];
    },
  } as unknown as AlpacaPositionService;

  const duplicateService =
    new CorporateActionPositionAssociationService(
      effectiveService,
      duplicatePositionService,
    );

  try {
    await duplicateService.associateWithExistingPositions();
    checks.DUPLICATE_POSITION_REJECTED = false;
  } catch {
    checks.DUPLICATE_POSITION_REJECTED = true;
  }

  const invalidPositionService = {
    async getPositions() {
      return [
        {
          ...alpacaPosition,
          symbol: 'A APL',
        },
      ];
    },
  } as unknown as AlpacaPositionService;

  const invalidPositionAssociationService =
    new CorporateActionPositionAssociationService(
      effectiveService,
      invalidPositionService,
    );

  try {
    await invalidPositionAssociationService
      .associateWithExistingPositions();

    checks.INVALID_POSITION_SYMBOL_REJECTED = false;
  } catch {
    checks.INVALID_POSITION_SYMBOL_REJECTED = true;
  }

  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${name}: ${passed}`);
  }

  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failed.length > 0) {
    throw new Error(
      `PUNTO 180 FALLO: ${failed.join(', ')}`,
    );
  }

  console.log(
    'PUNTO 180 VERIFICADO CORRECTAMENTE.',
  );
}

main()
  .then(() => {
    console.log('EXIT_CODE: 0');
    console.log(
      'PUNTO 180 VERIFICADO CORRECTAMENTE.',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    console.log('EXIT_CODE: 1');
    process.exitCode = 1;
  });
