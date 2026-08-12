const assert = require('node:assert/strict');

const {
  MarketDataHaltAuditService,
} = require('../dist/src/market-data/market-data-halt-audit.service.js');

const {
  MarketDataHaltTransitionAuditService,
} = require('../dist/src/market-data/market-data-halt-transition-audit.service.js');

const {
  MarketDataTradingStatusService,
} = require('../dist/src/market-data/market-data-trading-status.service.js');

async function main() {
  const persisted = [];

  const prisma = {
    marketDataHaltEvent: {
      async create({ data }) {
        const record = {
          id: `audit-${persisted.length + 1}`,
          ...data,
          correlationId: data.correlationId ?? null,
          createdAt: new Date(
            `2026-08-12T21:00:0${persisted.length}.000Z`,
          ),
        };

        persisted.push(record);

        return record;
      },
    },
  };

  const correlationContext = {
    getCorrelationId() {
      return 'corr-point-168';
    },
  };

  const configService = {
    get(key) {
      if (key === 'app.tradingMode') {
        return 'PAPER';
      }

      if (key === 'alpaca.paper.apiKey') {
        return 'test-key';
      }

      if (key === 'alpaca.paper.apiSecret') {
        return 'test-secret';
      }

      return undefined;
    },
  };

  const auditService = new MarketDataHaltAuditService(
    prisma,
    correlationContext,
  );

  const transitionAudit =
    new MarketDataHaltTransitionAuditService(auditService);

  const tradingStatusService =
    new MarketDataTradingStatusService(
      configService,
      transitionAudit,
    );

  await tradingStatusService.ingestMessageAndAuditForVerification(
    {
      T: 's',
      S: 'AAPL',
      sc: 'T',
      sm: 'Normal Trading',
      rc: '',
      rm: '',
      t: '2026-08-12T20:00:00.000Z',
      z: 'C',
    },
    'sip',
    new Date('2026-08-12T20:00:01.000Z'),
  );

  const countAfterInitialNormal = persisted.length;

  await tradingStatusService.ingestMessageAndAuditForVerification(
    {
      T: 's',
      S: 'AAPL',
      sc: 'H',
      sm: 'Trading Halt',
      rc: 'T1',
      rm: 'News Pending',
      t: '2026-08-12T20:05:00.000Z',
      z: 'C',
    },
    'sip',
    new Date('2026-08-12T20:05:01.000Z'),
  );

  const countAfterHalt = persisted.length;

  await tradingStatusService.ingestMessageAndAuditForVerification(
    {
      T: 's',
      S: 'AAPL',
      sc: 'H',
      sm: 'Trading Halt',
      rc: 'T1',
      rm: 'News Pending',
      t: '2026-08-12T20:05:00.000Z',
      z: 'C',
    },
    'sip',
    new Date('2026-08-12T20:05:02.000Z'),
  );

  const countAfterDuplicate = persisted.length;

  await tradingStatusService.ingestMessageAndAuditForVerification(
    {
      T: 's',
      S: 'AAPL',
      sc: 'H',
      sm: 'Old Halt',
      rc: 'T1',
      rm: 'Old event',
      t: '2026-08-12T20:04:59.000Z',
      z: 'C',
    },
    'sip',
    new Date('2026-08-12T20:06:00.000Z'),
  );

  const countAfterOldMessage = persisted.length;

  await tradingStatusService.ingestMessageAndAuditForVerification(
    {
      T: 's',
      S: 'AAPL',
      sc: 'T',
      sm: 'Trading Resumed',
      rc: '',
      rm: '',
      t: '2026-08-12T20:10:00.000Z',
      z: 'C',
    },
    'sip',
    new Date('2026-08-12T20:10:01.000Z'),
  );

  const countAfterResume = persisted.length;

  await tradingStatusService.ingestMessageAndAuditForVerification(
    {
      T: 's',
      S: 'AAPL',
      sc: 'Q',
      sm: 'Quotation Resumed',
      rc: '',
      rm: '',
      t: '2026-08-12T20:11:00.000Z',
      z: 'C',
    },
    'sip',
    new Date('2026-08-12T20:11:01.000Z'),
  );

  const countAfterNonHaltChange = persisted.length;

  const halt = persisted[0];
  const resume = persisted[1];

  const assertions = {
    INITIAL_NON_HALT_NOT_AUDITED:
      countAfterInitialNormal === 0,

    HALT_AUDITED:
      countAfterHalt === 1 &&
      halt?.type === 'HALT',

    HALT_SYMBOL_NORMALIZED:
      halt?.symbol === 'AAPL',

    HALT_TIMESTAMP_PRESERVED:
      halt?.eventAt.toISOString() ===
      '2026-08-12T20:05:00.000Z',

    HALT_RECEIVED_AT_PRESERVED:
      halt?.receivedAt.toISOString() ===
      '2026-08-12T20:05:01.000Z',

    HALT_REASON_PRESERVED:
      halt?.reasonCode === 'T1' &&
      halt?.reasonMessage === 'News Pending',

    HALT_STATUS_PRESERVED:
      halt?.statusCode === 'H' &&
      halt?.statusMessage === 'Trading Halt',

    FEED_AND_TAPE_PRESERVED:
      halt?.feed === 'sip' &&
      halt?.tape === 'C',

    CORRELATION_ID_PRESERVED:
      halt?.correlationId === 'corr-point-168' &&
      resume?.correlationId === 'corr-point-168',

    DUPLICATE_HALT_NOT_AUDITED:
      countAfterDuplicate === 1,

    OLD_MESSAGE_NOT_AUDITED:
      countAfterOldMessage === 1,

    RESUME_AUDITED:
      countAfterResume === 2 &&
      resume?.type === 'RESUME',

    RESUME_TIMESTAMP_PRESERVED:
      resume?.eventAt.toISOString() ===
      '2026-08-12T20:10:00.000Z',

    RESUME_STATUS_PRESERVED:
      resume?.statusCode === 'T' &&
      resume?.statusMessage === 'Trading Resumed',

    NON_HALT_TO_NON_HALT_NOT_AUDITED:
      countAfterNonHaltChange === 2,

    EXACTLY_TWO_AUDIT_EVENTS:
      persisted.length === 2,
  };

  for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
  }

  assert.ok(
    Object.values(assertions).every(Boolean),
    'Una o más verificaciones del punto 168 fallaron',
  );

  console.log('PUNTO 168 VERIFICADO CORRECTAMENTE.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});