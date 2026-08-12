const assert = require('node:assert/strict');

const {
  MarketDataHaltSignalInvalidationService,
} = require('../dist/src/market-data/market-data-halt-signal-invalidation.service.js');

function makeHaltDetectionService(result) {
  return {
    detect(symbol) {
      return {
        ...result,
        symbol: symbol.trim().toUpperCase(),
      };
    },
  };
}

const haltTimestamp = new Date('2026-08-12T20:15:30.123Z');

const haltedService = new MarketDataHaltSignalInvalidationService(
  makeHaltDetectionService({
    state: 'HALTED',
    halted: true,
    haltedAt: haltTimestamp,
    haltReason: {
      code: 'T1',
      message: 'News Pending',
    },
    status: null,
  }),
);

const beforeHalt = haltedService.evaluate({
  symbol: 'aapl',
  timestamp: new Date('2026-08-12T20:15:29.000Z'),
});

const exactlyAtHalt = haltedService.evaluate({
  symbol: 'AAPL',
  timestamp: new Date('2026-08-12T20:15:30.123Z'),
});

const afterHalt = haltedService.evaluate({
  symbol: 'AAPL',
  timestamp: new Date('2026-08-12T20:15:31.000Z'),
});

let preHaltRejected = false;

try {
  haltedService.assertValid({
    symbol: 'aapl',
    timestamp: new Date('2026-08-12T20:15:00.000Z'),
  });
} catch (error) {
  const message =
    error instanceof Error ? error.message : String(error);

  preHaltRejected =
    message.includes('AAPL') &&
    message.includes('invalid') &&
    message.includes(haltTimestamp.toISOString());
}

const normalService = new MarketDataHaltSignalInvalidationService(
  makeHaltDetectionService({
    state: 'NOT_HALTED',
    halted: false,
    haltedAt: null,
    haltReason: null,
    status: null,
  }),
);

const normalResult = normalService.evaluate({
  symbol: 'msft',
  timestamp: new Date('2026-08-12T20:00:00.000Z'),
});

let unknownRejected = false;

const unknownService = new MarketDataHaltSignalInvalidationService(
  makeHaltDetectionService({
    state: 'UNKNOWN',
    halted: false,
    haltedAt: null,
    haltReason: null,
    status: null,
  }),
);

try {
  unknownService.evaluate({
    symbol: 'nvda',
    timestamp: new Date('2026-08-12T20:00:00.000Z'),
  });
} catch (error) {
  const message =
    error instanceof Error ? error.message : String(error);

  unknownRejected =
    message.includes('unknown') &&
    message.includes('NVDA');
}

let missingHaltTimestampRejected = false;

const missingTimestampService =
  new MarketDataHaltSignalInvalidationService(
    makeHaltDetectionService({
      state: 'HALTED',
      halted: true,
      haltedAt: null,
      haltReason: {
        code: 'T1',
        message: 'News Pending',
      },
      status: null,
    }),
  );

try {
  missingTimestampService.evaluate({
    symbol: 'TSLA',
    timestamp: new Date('2026-08-12T20:00:00.000Z'),
  });
} catch (error) {
  const message =
    error instanceof Error ? error.message : String(error);

  missingHaltTimestampRejected =
    message.includes('timestamp') &&
    message.includes('TSLA');
}

let invalidSignalTimestampRejected = false;

try {
  haltedService.evaluate({
    symbol: 'AAPL',
    timestamp: new Date('invalid'),
  });
} catch {
  invalidSignalTimestampRejected = true;
}

const haltTimestampPreservedBeforeMutation =
  beforeHalt.haltedAt?.toISOString() ===
  '2026-08-12T20:15:30.123Z';

const returnedHaltTimestamp = beforeHalt.haltedAt;

if (returnedHaltTimestamp !== null) {
  returnedHaltTimestamp.setUTCFullYear(2000);
}

const freshEvaluation = haltedService.evaluate({
  symbol: 'AAPL',
  timestamp: new Date('2026-08-12T20:15:29.000Z'),
});

const assertions = {
  SYMBOL_NORMALIZED:
    beforeHalt.symbol === 'AAPL',

  SIGNAL_BEFORE_HALT_INVALIDATED:
    beforeHalt.invalidated === true,

  SIGNAL_EXACTLY_AT_HALT_INVALIDATED:
    exactlyAtHalt.invalidated === true,

  SIGNAL_AFTER_HALT_NOT_CLASSIFIED_AS_PRE_HALT:
    afterHalt.invalidated === false,

  HALT_TIMESTAMP_PRESERVED:
    haltTimestampPreservedBeforeMutation,

  HALT_REASON_PRESERVED:
    beforeHalt.haltReason?.code === 'T1' &&
    beforeHalt.haltReason?.message === 'News Pending',

  ASSERT_VALID_REJECTS_PRE_HALT_SIGNAL:
    preHaltRejected,

  NON_HALTED_SIGNAL_REMAINS_VALID:
    normalResult.invalidated === false,

  NON_HALTED_HAS_NO_HALT_METADATA:
    normalResult.haltedAt === null &&
    normalResult.haltReason === null,

  UNKNOWN_HALT_STATE_FAILS_CLOSED:
    unknownRejected,

  HALTED_WITHOUT_TIMESTAMP_FAILS_CLOSED:
    missingHaltTimestampRejected,

  INVALID_SIGNAL_TIMESTAMP_REJECTED:
    invalidSignalTimestampRejected,

  HALT_TIMESTAMP_DEFENSIVELY_COPIED:
    freshEvaluation.haltedAt?.toISOString() ===
    '2026-08-12T20:15:30.123Z',
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

assert.ok(
  Object.values(assertions).every(Boolean),
  'Una o mÃ¡s verificaciones del punto 164 fallaron',
);

console.log('PUNTO 164 VERIFICADO CORRECTAMENTE.');