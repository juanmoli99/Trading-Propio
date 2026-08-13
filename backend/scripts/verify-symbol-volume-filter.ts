import { SymbolVolumeFilterService } from '../src/watchlist/symbol-volume-filter.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectThrow(name: string, action: () => void): void {
  let rejected = false;

  try {
    action();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function main(): void {
  const service = new SymbolVolumeFilterService();

  const allowed = service.evaluate({
    symbol: '  aapl  ',
    volume: 1500000,
    minimumVolume: 1000000,
  });

  check('SYMBOL_NORMALIZED', allowed.symbol === 'AAPL');

  check('VOLUME_PRESERVED', allowed.volume === 1500000);

  check('MINIMUM_VOLUME_PRESERVED', allowed.minimumVolume === 1000000);

  check('ABOVE_MINIMUM_ALLOWED', allowed.allowed === true);

  check('ALLOWED_STATUS_CORRECT', allowed.status === 'ALLOWED');

  check('ALLOWED_REASON_PRESENT', allowed.reason.length > 0);

  const boundary = service.evaluate({
    symbol: 'AAPL',
    volume: 1000000,
    minimumVolume: 1000000,
  });

  check('MINIMUM_BOUNDARY_ALLOWED', boundary.allowed === true);

  check('MINIMUM_BOUNDARY_STATUS_CORRECT', boundary.status === 'ALLOWED');

  const below = service.evaluate({
    symbol: 'AAPL',
    volume: 999999,
    minimumVolume: 1000000,
  });

  check('BELOW_MINIMUM_BLOCKED', below.allowed === false);

  check(
    'BELOW_MINIMUM_STATUS_CORRECT',
    below.status === 'VOLUME_BELOW_MINIMUM',
  );

  check('BELOW_MINIMUM_REASON_PRESENT', below.reason.length > 0);

  const zeroAllowed = service.evaluate({
    symbol: 'AAPL',
    volume: 0,
    minimumVolume: 0,
  });

  check('ZERO_VOLUME_ALLOWED_WHEN_MINIMUM_ZERO', zeroAllowed.allowed === true);

  const invalidVolumes: Array<number | null> = [
    null,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  for (const volume of invalidVolumes) {
    const result = service.evaluate({
      symbol: 'AAPL',
      volume,
      minimumVolume: 1000000,
    });

    check(`INVALID_VOLUME_BLOCKED_${String(volume)}`, result.allowed === false);

    check(
      `INVALID_VOLUME_STATUS_${String(volume)}`,
      result.status === 'INVALID_VOLUME',
    );
  }

  service.assertAllowed({
    symbol: 'AAPL',
    volume: 1500000,
    minimumVolume: 1000000,
  });

  check('ASSERT_ALLOWED_PASSES', true);

  expectThrow('ASSERT_ALLOWED_REJECTS_BELOW_MINIMUM', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      volume: 500000,
      minimumVolume: 1000000,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_INVALID_VOLUME', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      volume: null,
      minimumVolume: 1000000,
    }),
  );

  const invalidMinimums = [
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  for (const minimumVolume of invalidMinimums) {
    expectThrow(`INVALID_MINIMUM_REJECTED_${String(minimumVolume)}`, () =>
      service.evaluate({
        symbol: 'AAPL',
        volume: 1500000,
        minimumVolume,
      }),
    );
  }

  for (const symbol of ['', '   ', 'A'.repeat(33)]) {
    expectThrow(`INVALID_SYMBOL_REJECTED_${JSON.stringify(symbol)}`, () =>
      service.evaluate({
        symbol,
        volume: 1500000,
        minimumVolume: 1000000,
      }),
    );
  }

  const repeated = service.evaluate({
    symbol: 'AAPL',
    volume: 1500000,
    minimumVolume: 1000000,
  });

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    repeated.symbol === allowed.symbol &&
      repeated.volume === allowed.volume &&
      repeated.minimumVolume === allowed.minimumVolume &&
      repeated.allowed === allowed.allowed &&
      repeated.status === allowed.status &&
      repeated.reason === allowed.reason,
  );

  console.log('PUNTO 203 VERIFICADO CORRECTAMENTE.');
  console.log('EXIT_CODE: 0');
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
