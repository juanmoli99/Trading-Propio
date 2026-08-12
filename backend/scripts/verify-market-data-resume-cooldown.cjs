const assert = require('node:assert/strict');

const {
  MarketDataResumeCooldownService,
} = require('../dist/src/market-data/market-data-resume-cooldown.service.js');

function createConfig(cooldownMs) {
  return {
    get(key) {
      if (key === 'marketData.resumeCooldownMs') {
        return cooldownMs;
      }

      return undefined;
    },
  };
}

function createResumeDetection(overrides = {}) {
  return {
    detectResume(symbol) {
      return {
        symbol: symbol.trim().toUpperCase(),
        resumed: true,
        previousState: 'HALTED',
        currentState: 'NOT_HALTED',
        previousStatus: {
          timestamp: new Date('2026-08-12T19:55:00.000Z'),
        },
        currentStatus: {
          timestamp: new Date('2026-08-12T20:00:00.000Z'),
        },
        ...overrides,
      };
    },
  };
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

const enabledService = new MarketDataResumeCooldownService(
  createConfig(60_000),
  createResumeDetection(),
);

verify('CONFIGURATION_USED', () => {
  assert.equal(enabledService.getCooldownMs(), 60_000);
});

verify('SYMBOL_NORMALIZED', () => {
  const result = enabledService.evaluate(
    ' aapl ',
    new Date('2026-08-12T20:00:30.000Z'),
  );

  assert.equal(result.symbol, 'AAPL');
});

verify('COOLDOWN_ENABLED', () => {
  const result = enabledService.evaluate(
    'AAPL',
    new Date('2026-08-12T20:00:30.000Z'),
  );

  assert.equal(result.enabled, true);
  assert.equal(result.cooldownMs, 60_000);
});

verify('COOLDOWN_ACTIVE_INSIDE_WINDOW', () => {
  const result = enabledService.evaluate(
    'AAPL',
    new Date('2026-08-12T20:00:30.000Z'),
  );

  assert.equal(result.active, true);
  assert.equal(result.remainingMs, 30_000);
});

verify('RESUME_TIMESTAMP_PRESERVED', () => {
  const result = enabledService.evaluate(
    'AAPL',
    new Date('2026-08-12T20:00:30.000Z'),
  );

  assert.equal(
    result.resumedAt.toISOString(),
    '2026-08-12T20:00:00.000Z',
  );
});

verify('COOLDOWN_END_CALCULATED_CORRECTLY', () => {
  const result = enabledService.evaluate(
    'AAPL',
    new Date('2026-08-12T20:00:30.000Z'),
  );

  assert.equal(
    result.cooldownEndsAt.toISOString(),
    '2026-08-12T20:01:00.000Z',
  );
});

verify('ENTRY_BLOCKED_DURING_COOLDOWN', () => {
  assert.throws(() =>
    enabledService.assertEntryAllowed(
      'AAPL',
      new Date('2026-08-12T20:00:30.000Z'),
    ),
  );
});

verify('ENTRY_ALLOWED_EXACTLY_AT_COOLDOWN_END', () => {
  enabledService.assertEntryAllowed(
    'AAPL',
    new Date('2026-08-12T20:01:00.000Z'),
  );
});

verify('ENTRY_ALLOWED_AFTER_COOLDOWN', () => {
  enabledService.assertEntryAllowed(
    'AAPL',
    new Date('2026-08-12T20:01:01.000Z'),
  );
});

const disabledService = new MarketDataResumeCooldownService(
  createConfig(0),
  createResumeDetection(),
);

verify('ZERO_CONFIGURATION_DISABLES_COOLDOWN', () => {
  const result = disabledService.evaluate(
    'AAPL',
    new Date('2026-08-12T20:00:00.000Z'),
  );

  assert.equal(result.enabled, false);
  assert.equal(result.active, false);
  assert.equal(result.remainingMs, 0);
});

verify('DISABLED_COOLDOWN_ALLOWS_ENTRY', () => {
  disabledService.assertEntryAllowed(
    'AAPL',
    new Date('2026-08-12T20:00:00.000Z'),
  );
});

verify('NO_CONFIRMED_RESUME_FAILS_CLOSED', () => {
  const service = new MarketDataResumeCooldownService(
    createConfig(60_000),
    createResumeDetection({
      resumed: false,
      previousState: 'NOT_HALTED',
      currentState: 'NOT_HALTED',
    }),
  );

  assert.throws(() =>
    service.evaluate(
      'AAPL',
      new Date('2026-08-12T20:00:30.000Z'),
    ),
  );
});

verify('MISSING_RESUME_TIMESTAMP_FAILS_CLOSED', () => {
  const service = new MarketDataResumeCooldownService(
    createConfig(60_000),
    createResumeDetection({
      currentStatus: null,
    }),
  );

  assert.throws(() =>
    service.evaluate(
      'AAPL',
      new Date('2026-08-12T20:00:30.000Z'),
    ),
  );
});

verify('REFERENCE_BEFORE_RESUME_REJECTED', () => {
  assert.throws(() =>
    enabledService.evaluate(
      'AAPL',
      new Date('2026-08-12T19:59:59.999Z'),
    ),
  );
});

verify('INVALID_REFERENCE_TIMESTAMP_REJECTED', () => {
  assert.throws(() =>
    enabledService.evaluate(
      'AAPL',
      new Date('invalid'),
    ),
  );
});

verify('INVALID_CONFIGURATION_REJECTED', () => {
  const service = new MarketDataResumeCooldownService(
    createConfig(-1),
    createResumeDetection(),
  );

  assert.throws(() => service.getCooldownMs());
});

verify('EXCESSIVE_CONFIGURATION_REJECTED', () => {
  const service = new MarketDataResumeCooldownService(
    createConfig(1_800_001),
    createResumeDetection(),
  );

  assert.throws(() => service.getCooldownMs());
});

verify('RESUME_TIMESTAMP_DEFENSIVELY_COPIED', () => {
  const sourceTimestamp =
    new Date('2026-08-12T20:00:00.000Z');

  const service = new MarketDataResumeCooldownService(
    createConfig(60_000),
    createResumeDetection({
      currentStatus: {
        timestamp: sourceTimestamp,
      },
    }),
  );

  const result = service.evaluate(
    'AAPL',
    new Date('2026-08-12T20:00:30.000Z'),
  );

  result.resumedAt.setUTCFullYear(2000);

  assert.equal(
    sourceTimestamp.toISOString(),
    '2026-08-12T20:00:00.000Z',
  );
});

console.log('PUNTO 167 VERIFICADO CORRECTAMENTE.');