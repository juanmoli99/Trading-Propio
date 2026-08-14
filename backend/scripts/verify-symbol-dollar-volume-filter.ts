import { SymbolDollarVolumeFilterService } from '../src/watchlist/symbol-dollar-volume-filter.service';

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
  const service = new SymbolDollarVolumeFilterService();

  const allowed = service.evaluate({
    symbol: '  aapl  ',
    price: 150,
    volume: 1000000,
    minimumDollarVolume: 100000000,
  });

  check('SYMBOL_NORMALIZED', allowed.symbol === 'AAPL');

  check('PRICE_PRESERVED', allowed.price === 150);

  check('VOLUME_PRESERVED', allowed.volume === 1000000);

  check('DOLLAR_VOLUME_CALCULATED', allowed.dollarVolume === 150000000);

  check(
    'MINIMUM_DOLLAR_VOLUME_PRESERVED',
    allowed.minimumDollarVolume === 100000000,
  );

  check('ABOVE_MINIMUM_ALLOWED', allowed.allowed === true);

  check('ALLOWED_STATUS_CORRECT', allowed.status === 'ALLOWED');

  check('ALLOWED_REASON_PRESENT', allowed.reason.length > 0);

  const boundary = service.evaluate({
    symbol: 'AAPL',
    price: 100,
    volume: 1000000,
    minimumDollarVolume: 100000000,
  });

  check('MINIMUM_BOUNDARY_CALCULATED', boundary.dollarVolume === 100000000);

  check('MINIMUM_BOUNDARY_ALLOWED', boundary.allowed === true);

  check('MINIMUM_BOUNDARY_STATUS_CORRECT', boundary.status === 'ALLOWED');

  const below = service.evaluate({
    symbol: 'AAPL',
    price: 99,
    volume: 1000000,
    minimumDollarVolume: 100000000,
  });

  check('BELOW_MINIMUM_CALCULATED', below.dollarVolume === 99000000);

  check('BELOW_MINIMUM_BLOCKED', below.allowed === false);

  check(
    'BELOW_MINIMUM_STATUS_CORRECT',
    below.status === 'DOLLAR_VOLUME_BELOW_MINIMUM',
  );

  check('BELOW_MINIMUM_REASON_PRESENT', below.reason.length > 0);

  const zero = service.evaluate({
    symbol: 'AAPL',
    price: 100,
    volume: 0,
    minimumDollarVolume: 0,
  });

  check('ZERO_DOLLAR_VOLUME_CALCULATED', zero.dollarVolume === 0);

  check('ZERO_ALLOWED_WHEN_MINIMUM_ZERO', zero.allowed === true);

  for (const price of [
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const result = service.evaluate({
      symbol: 'AAPL',
      price,
      volume: 1000000,
      minimumDollarVolume: 100000000,
    });

    check(`INVALID_PRICE_BLOCKED_${String(price)}`, result.allowed === false);

    check(
      `INVALID_PRICE_STATUS_${String(price)}`,
      result.status === 'INVALID_PRICE',
    );

    check(
      `INVALID_PRICE_DOLLAR_VOLUME_NULL_${String(price)}`,
      result.dollarVolume === null,
    );
  }

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
      price: 100,
      volume,
      minimumDollarVolume: 100000000,
    });

    check(`INVALID_VOLUME_BLOCKED_${String(volume)}`, result.allowed === false);

    check(
      `INVALID_VOLUME_STATUS_${String(volume)}`,
      result.status === 'INVALID_VOLUME',
    );

    check(
      `INVALID_VOLUME_DOLLAR_VOLUME_NULL_${String(volume)}`,
      result.dollarVolume === null,
    );
  }

  const overflow = service.evaluate({
    symbol: 'AAPL',
    price: Number.MAX_VALUE,
    volume: 2,
    minimumDollarVolume: 0,
  });

  check('OVERFLOW_BLOCKED', overflow.allowed === false);

  check('OVERFLOW_STATUS_CORRECT', overflow.status === 'INVALID_DOLLAR_VOLUME');

  check('OVERFLOW_DOLLAR_VOLUME_NULL', overflow.dollarVolume === null);

  service.assertAllowed({
    symbol: 'AAPL',
    price: 150,
    volume: 1000000,
    minimumDollarVolume: 100000000,
  });

  check('ASSERT_ALLOWED_PASSES', true);

  expectThrow('ASSERT_ALLOWED_REJECTS_BELOW_MINIMUM', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: 50,
      volume: 1000000,
      minimumDollarVolume: 100000000,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_INVALID_PRICE', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: Number.NaN,
      volume: 1000000,
      minimumDollarVolume: 100000000,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_INVALID_VOLUME', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: 100,
      volume: null,
      minimumDollarVolume: 100000000,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_OVERFLOW', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: Number.MAX_VALUE,
      volume: 2,
      minimumDollarVolume: 0,
    }),
  );

  for (const minimumDollarVolume of [
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(`INVALID_MINIMUM_REJECTED_${String(minimumDollarVolume)}`, () =>
      service.evaluate({
        symbol: 'AAPL',
        price: 100,
        volume: 1000000,
        minimumDollarVolume,
      }),
    );
  }

  for (const symbol of ['', '   ', 'A'.repeat(33)]) {
    expectThrow(`INVALID_SYMBOL_REJECTED_${JSON.stringify(symbol)}`, () =>
      service.evaluate({
        symbol,
        price: 100,
        volume: 1000000,
        minimumDollarVolume: 100000000,
      }),
    );
  }

  const repeated = service.evaluate({
    symbol: 'AAPL',
    price: 150,
    volume: 1000000,
    minimumDollarVolume: 100000000,
  });

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    repeated.symbol === allowed.symbol &&
      repeated.price === allowed.price &&
      repeated.volume === allowed.volume &&
      repeated.dollarVolume === allowed.dollarVolume &&
      repeated.minimumDollarVolume === allowed.minimumDollarVolume &&
      repeated.allowed === allowed.allowed &&
      repeated.status === allowed.status &&
      repeated.reason === allowed.reason,
  );

  console.log('PUNTO 204 VERIFICADO CORRECTAMENTE.');
  console.log('EXIT_CODE: 0');
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

