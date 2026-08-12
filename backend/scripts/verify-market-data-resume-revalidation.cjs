const assert = require('node:assert/strict');

const {
  MarketDataResumeRevalidationService,
} = require('../dist/src/market-data/market-data-resume-revalidation.service');

const resumedAt = new Date('2026-08-12T15:00:00.000Z');

function createResume(overrides = {}) {
  return {
    symbol: 'AAPL',
    resumed: true,
    previousState: 'HALTED',
    currentState: 'NOT_HALTED',
    previousStatus: {
      timestamp: new Date('2026-08-12T14:55:00.000Z'),
    },
    currentStatus: {
      timestamp: new Date(resumedAt),
    },
    ...overrides,
  };
}

let currentResume = createResume();

const haltDetectionService = {
  detectResume(symbol) {
    return {
      ...currentResume,
      symbol: symbol.trim().toUpperCase(),
      currentStatus: currentResume.currentStatus
        ? {
            ...currentResume.currentStatus,
            timestamp: new Date(currentResume.currentStatus.timestamp),
          }
        : null,
    };
  },
};

const service = new MarketDataResumeRevalidationService(
  haltDetectionService,
);

function checks(overrides = {}) {
  const validatedAt = new Date('2026-08-12T15:00:01.000Z');

  return [
    {
      name: 'SPREAD',
      passed: true,
      validatedAt,
      ...overrides.SPREAD,
    },
    {
      name: 'VOLATILITY',
      passed: true,
      validatedAt,
      ...overrides.VOLATILITY,
    },
    {
      name: 'SIGNAL',
      passed: true,
      validatedAt,
      ...overrides.SIGNAL,
    },
    {
      name: 'RISK',
      passed: true,
      validatedAt,
      ...overrides.RISK,
    },
  ];
}

function verify(name, fn) {
  try {
    fn();
    console.log(`${name}: true`);
  } catch (error) {
    console.log(`${name}: false`);
    throw error;
  }
}

verify('SYMBOL_NORMALIZED', () => {
  const result = service.evaluate({
    symbol: ' aapl ',
    checks: checks(),
  });

  assert.equal(result.symbol, 'AAPL');
});

verify('CONFIRMED_RESUME_ACCEPTED', () => {
  const result = service.evaluate({
    symbol: 'AAPL',
    checks: checks(),
  });

  assert.equal(result.resumed, true);
  assert.equal(result.valid, true);
});

verify('RESUME_TIMESTAMP_PRESERVED', () => {
  const result = service.evaluate({
    symbol: 'AAPL',
    checks: checks(),
  });

  assert.equal(
    result.resumedAt.toISOString(),
    resumedAt.toISOString(),
  );
});

verify('ALL_REQUIRED_CHECKS_PRESENT', () => {
  const result = service.evaluate({
    symbol: 'AAPL',
    checks: checks(),
  });

  assert.deepEqual(
    result.checks.map((item) => item.name),
    ['SPREAD', 'VOLATILITY', 'SIGNAL', 'RISK'],
  );
});

verify('FAILED_SPREAD_BLOCKS_REVALIDATION', () => {
  const result = service.evaluate({
    symbol: 'AAPL',
    checks: checks({
      SPREAD: {
        passed: false,
        reason: 'spread too wide',
      },
    }),
  });

  assert.equal(result.valid, false);
  assert.ok(result.reasons.some((reason) =>
    reason.includes('SPREAD'),
  ));
});

verify('FAILED_VOLATILITY_BLOCKS_REVALIDATION', () => {
  const result = service.evaluate({
    symbol: 'AAPL',
    checks: checks({
      VOLATILITY: {
        passed: false,
        reason: 'volatility too high',
      },
    }),
  });

  assert.equal(result.valid, false);
});

verify('FAILED_SIGNAL_BLOCKS_REVALIDATION', () => {
  const result = service.evaluate({
    symbol: 'AAPL',
    checks: checks({
      SIGNAL: {
        passed: false,
        reason: 'signal no longer valid',
      },
    }),
  });

  assert.equal(result.valid, false);
});

verify('FAILED_RISK_BLOCKS_REVALIDATION', () => {
  const result = service.evaluate({
    symbol: 'AAPL',
    checks: checks({
      RISK: {
        passed: false,
        reason: 'risk rejected',
      },
    }),
  });

  assert.equal(result.valid, false);
});

verify('MISSING_CHECK_FAILS_CLOSED', () => {
  assert.throws(() =>
    service.evaluate({
      symbol: 'AAPL',
      checks: checks().filter(
        (check) => check.name !== 'RISK',
      ),
    }),
  );
});

verify('DUPLICATE_CHECK_REJECTED', () => {
  const values = checks();

  assert.throws(() =>
    service.evaluate({
      symbol: 'AAPL',
      checks: [...values, values[0]],
    }),
  );
});

verify('PRE_RESUME_VALIDATION_REJECTED', () => {
  assert.throws(() =>
    service.evaluate({
      symbol: 'AAPL',
      checks: checks({
        SPREAD: {
          validatedAt: new Date(
            '2026-08-12T14:59:59.000Z',
          ),
        },
      }),
    }),
  );
});

verify('AT_RESUME_VALIDATION_REJECTED', () => {
  assert.throws(() =>
    service.evaluate({
      symbol: 'AAPL',
      checks: checks({
        SIGNAL: {
          validatedAt: new Date(resumedAt),
        },
      }),
    }),
  );
});

verify('ASSERT_VALID_REJECTS_FAILED_REVALIDATION', () => {
  assert.throws(() =>
    service.assertValid({
      symbol: 'AAPL',
      checks: checks({
        RISK: {
          passed: false,
          reason: 'risk rejected',
        },
      }),
    }),
  );
});

verify('NO_CONFIRMED_RESUME_FAILS_CLOSED', () => {
  currentResume = createResume({
    resumed: false,
    previousState: 'NOT_HALTED',
    currentState: 'NOT_HALTED',
  });

  assert.throws(() =>
    service.evaluate({
      symbol: 'AAPL',
      checks: checks(),
    }),
  );

  currentResume = createResume();
});

verify('MISSING_RESUME_TIMESTAMP_FAILS_CLOSED', () => {
  currentResume = createResume({
    currentStatus: null,
  });

  assert.throws(() =>
    service.evaluate({
      symbol: 'AAPL',
      checks: checks(),
    }),
  );

  currentResume = createResume();
});

verify('INVALID_CHECK_TIMESTAMP_REJECTED', () => {
  assert.throws(() =>
    service.evaluate({
      symbol: 'AAPL',
      checks: checks({
        VOLATILITY: {
          validatedAt: new Date('invalid'),
        },
      }),
    }),
  );
});

verify('TIMESTAMPS_DEFENSIVELY_COPIED', () => {
  const inputTimestamp =
    new Date('2026-08-12T15:00:01.000Z');

  const result = service.evaluate({
    symbol: 'AAPL',
    checks: checks({
      SPREAD: {
        validatedAt: inputTimestamp,
      },
    }),
  });

  assert.notEqual(
    result.checks[0].validatedAt,
    inputTimestamp,
  );

  assert.notEqual(
    result.resumedAt,
    currentResume.currentStatus.timestamp,
  );
});

console.log('PUNTO 166 VERIFICADO CORRECTAMENTE.');