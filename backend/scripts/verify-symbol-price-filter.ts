import { SymbolPriceFilterService } from '../src/watchlist/symbol-price-filter.service';

function check(name: string, condition: boolean): void {
  console.log(`${name}: ${condition}`);

  if (!condition) {
    throw new Error(`Verification failed: ${name}`);
  }
}

function expectThrow(name: string, callback: () => void): void {
  let rejected = false;

  try {
    callback();
  } catch {
    rejected = true;
  }

  check(name, rejected);
}

function main(): void {
  const service = new SymbolPriceFilterService();

  const allowed = service.evaluate({
    symbol: '  aapl  ',
    price: 150,
    minimumPrice: 10,
    maximumPrice: 500,
  });

  check('SYMBOL_NORMALIZED', allowed.symbol === 'AAPL');

  check('PRICE_PRESERVED', allowed.price === 150);

  check('MINIMUM_PRICE_PRESERVED', allowed.minimumPrice === 10);

  check('MAXIMUM_PRICE_PRESERVED', allowed.maximumPrice === 500);

  check('IN_RANGE_ALLOWED', allowed.allowed === true);

  check('IN_RANGE_STATUS_CORRECT', allowed.status === 'ALLOWED');

  check('IN_RANGE_REASON_PRESENT', allowed.reason.length > 0);

  const minimumBoundary = service.evaluate({
    symbol: 'AAPL',
    price: 10,
    minimumPrice: 10,
    maximumPrice: 500,
  });

  check('MINIMUM_BOUNDARY_ALLOWED', minimumBoundary.allowed === true);

  const maximumBoundary = service.evaluate({
    symbol: 'AAPL',
    price: 500,
    minimumPrice: 10,
    maximumPrice: 500,
  });

  check('MAXIMUM_BOUNDARY_ALLOWED', maximumBoundary.allowed === true);

  const below = service.evaluate({
    symbol: 'AAPL',
    price: 9.99,
    minimumPrice: 10,
    maximumPrice: 500,
  });

  check('BELOW_MINIMUM_BLOCKED', below.allowed === false);

  check('BELOW_MINIMUM_STATUS_CORRECT', below.status === 'PRICE_BELOW_MINIMUM');

  const above = service.evaluate({
    symbol: 'AAPL',
    price: 500.01,
    minimumPrice: 10,
    maximumPrice: 500,
  });

  check('ABOVE_MAXIMUM_BLOCKED', above.allowed === false);

  check('ABOVE_MAXIMUM_STATUS_CORRECT', above.status === 'PRICE_ABOVE_MAXIMUM');

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
      minimumPrice: 10,
      maximumPrice: 500,
    });

    check(`INVALID_PRICE_BLOCKED_${String(price)}`, result.allowed === false);

    check(
      `INVALID_PRICE_STATUS_${String(price)}`,
      result.status === 'INVALID_PRICE',
    );
  }

  service.assertAllowed({
    symbol: 'AAPL',
    price: 100,
    minimumPrice: 10,
    maximumPrice: 500,
  });

  check('ASSERT_ALLOWED_PASSES_IN_RANGE', true);

  expectThrow('ASSERT_ALLOWED_REJECTS_BELOW_MINIMUM', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: 5,
      minimumPrice: 10,
      maximumPrice: 500,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_ABOVE_MAXIMUM', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: 600,
      minimumPrice: 10,
      maximumPrice: 500,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_INVALID_PRICE', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: Number.NaN,
      minimumPrice: 10,
      maximumPrice: 500,
    }),
  );

  for (const minimumPrice of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    expectThrow(`INVALID_MINIMUM_REJECTED_${String(minimumPrice)}`, () =>
      service.evaluate({
        symbol: 'AAPL',
        price: 100,
        minimumPrice,
        maximumPrice: 500,
      }),
    );
  }

  for (const maximumPrice of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    expectThrow(`INVALID_MAXIMUM_REJECTED_${String(maximumPrice)}`, () =>
      service.evaluate({
        symbol: 'AAPL',
        price: 100,
        minimumPrice: 10,
        maximumPrice,
      }),
    );
  }

  expectThrow('MAXIMUM_BELOW_MINIMUM_REJECTED', () =>
    service.evaluate({
      symbol: 'AAPL',
      price: 100,
      minimumPrice: 500,
      maximumPrice: 10,
    }),
  );

  for (const symbol of ['', '   ', 'A'.repeat(33)]) {
    expectThrow(`INVALID_SYMBOL_REJECTED_${JSON.stringify(symbol)}`, () =>
      service.evaluate({
        symbol,
        price: 100,
        minimumPrice: 10,
        maximumPrice: 500,
      }),
    );
  }

  const repeated = service.evaluate({
    symbol: 'AAPL',
    price: 150,
    minimumPrice: 10,
    maximumPrice: 500,
  });

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    repeated.symbol === allowed.symbol &&
      repeated.price === allowed.price &&
      repeated.minimumPrice === allowed.minimumPrice &&
      repeated.maximumPrice === allowed.maximumPrice &&
      repeated.allowed === allowed.allowed &&
      repeated.status === allowed.status &&
      repeated.reason === allowed.reason,
  );

  console.log('PUNTO 202 VERIFICADO CORRECTAMENTE.');
  console.log('EXIT_CODE: 0');
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

