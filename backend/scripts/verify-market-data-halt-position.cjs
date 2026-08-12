const assert = require('node:assert/strict');

const { AlpacaHaltPositionService } = require('../dist/src/alpaca/alpaca-halt-position.service.js');

async function main() {
  const position = {
    assetId: 'asset-aapl',
    symbol: 'AAPL',
    exchange: 'NASDAQ',
    assetClass: 'us_equity',
    quantity: '10',
    availableQuantity: '10',
    side: 'long',
    averageEntryPrice: '195',
    marketValue: '2000',
    costBasis: '1950',
    unrealizedPl: '50',
    unrealizedPlPercent: '0.025641',
    currentPrice: '200',
    lastDayPrice: '198',
    changeToday: '0.010101',
  };

  let requestedPositionIdentifier = null;

  const positionService = {
    async getPosition(identifier) {
      requestedPositionIdentifier = identifier;
      return position;
    },
  };

  const haltedAt = new Date('2026-08-12T20:15:30.123Z');

  const haltedDetectionService = {
    detect(symbol) {
      return {
        symbol: symbol.trim().toUpperCase(),
        state: 'HALTED',
        halted: true,
        haltedAt,
        haltReason: {
          code: 'T1',
          message: 'News Pending',
        },
        status: null,
      };
    },
  };

  const haltedService = new AlpacaHaltPositionService(
    positionService,
    haltedDetectionService,
  );

  const haltedResult = await haltedService.inspect('aapl');

  const haltedAssertions = {
    HALTED_SYMBOL_NORMALIZED:
      haltedResult.symbol === 'AAPL',

    POSITION_REQUESTED_WITH_NORMALIZED_SYMBOL:
      requestedPositionIdentifier === 'AAPL',

    POSITION_MARKED_AS_HALT_AFFECTED:
      haltedResult.affectedByHalt === true,

    POSITION_DATA_PRESERVED:
      haltedResult.position.symbol === 'AAPL' &&
      haltedResult.position.quantity === '10' &&
      haltedResult.position.averageEntryPrice === '195' &&
      haltedResult.position.currentPrice === '200',

    HALT_TIMESTAMP_PRESERVED:
      haltedResult.haltedAt instanceof Date &&
      haltedResult.haltedAt.toISOString() === haltedAt.toISOString(),

    HALT_REASON_PRESERVED:
      haltedResult.haltReason?.code === 'T1' &&
      haltedResult.haltReason?.message === 'News Pending',
  };

  const normalDetectionService = {
    detect(symbol) {
      return {
        symbol: symbol.trim().toUpperCase(),
        state: 'NOT_HALTED',
        halted: false,
        haltedAt: null,
        haltReason: null,
        status: null,
      };
    },
  };

  const normalService = new AlpacaHaltPositionService(
    positionService,
    normalDetectionService,
  );

  const normalResult = await normalService.inspect('aapl');

  const normalAssertions = {
    NORMAL_POSITION_NOT_MARKED:
      normalResult.affectedByHalt === false,

    NORMAL_POSITION_HAS_NO_HALT_TIMESTAMP:
      normalResult.haltedAt === null,

    NORMAL_POSITION_HAS_NO_HALT_REASON:
      normalResult.haltReason === null,
  };

  let unknownRejected = false;
  let positionRequestedForUnknown = false;

  const unknownPositionService = {
    async getPosition() {
      positionRequestedForUnknown = true;
      return position;
    },
  };

  const unknownDetectionService = {
    detect(symbol) {
      return {
        symbol: symbol.trim().toUpperCase(),
        state: 'UNKNOWN',
        halted: false,
        haltedAt: null,
        haltReason: null,
        status: null,
      };
    },
  };

  const unknownService = new AlpacaHaltPositionService(
    unknownPositionService,
    unknownDetectionService,
  );

  try {
    await unknownService.inspect('aapl');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    unknownRejected =
      message.includes('unknown') &&
      message.includes('AAPL');
  }

  const unknownAssertions = {
    UNKNOWN_HALT_STATE_REJECTED:
      unknownRejected,

    UNKNOWN_STATE_FAILS_BEFORE_POSITION_REQUEST:
      positionRequestedForUnknown === false,
  };

  const assertions = {
    ...haltedAssertions,
    ...normalAssertions,
    ...unknownAssertions,
  };

  for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
  }

  assert.ok(
    Object.values(assertions).every(Boolean),
    'Una o más verificaciones del punto 163 fallaron',
  );

  console.log('PUNTO 163 VERIFICADO CORRECTAMENTE.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});