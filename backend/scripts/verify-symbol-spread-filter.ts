import { SymbolSpreadFilterService } from '../src/watchlist/symbol-spread-filter.service';

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
  const service = new SymbolSpreadFilterService();

  const allowed = service.evaluate({
    symbol: '  aapl  ',
    bidPrice: 99,
    askPrice: 101,
    maximumSpreadPercent: 2,
  });

  check('SYMBOL_NORMALIZED', allowed.symbol === 'AAPL');

  check('BID_PRESERVED', allowed.bidPrice === 99);

  check('ASK_PRESERVED', allowed.askPrice === 101);

  check('MIDPOINT_CALCULATED', allowed.midpoint === 100);

  check('SPREAD_CALCULATED', allowed.spread === 2);

  check('SPREAD_PERCENT_CALCULATED', allowed.spreadPercent === 2);

  check('MAXIMUM_SPREAD_PRESERVED', allowed.maximumSpreadPercent === 2);

  check('MAXIMUM_BOUNDARY_ALLOWED', allowed.allowed === true);

  check('ALLOWED_STATUS_CORRECT', allowed.status === 'ALLOWED');

  check('ALLOWED_REASON_PRESENT', allowed.reason.length > 0);

  const zeroSpread = service.evaluate({
    symbol: 'AAPL',
    bidPrice: 100,
    askPrice: 100,
    maximumSpreadPercent: 0,
  });

  check('ZERO_SPREAD_CALCULATED', zeroSpread.spread === 0);

  check('ZERO_SPREAD_PERCENT_CALCULATED', zeroSpread.spreadPercent === 0);

  check('ZERO_SPREAD_ALLOWED', zeroSpread.allowed === true);

  const above = service.evaluate({
    symbol: 'AAPL',
    bidPrice: 99,
    askPrice: 101,
    maximumSpreadPercent: 1.99,
  });

  check('ABOVE_MAXIMUM_BLOCKED', above.allowed === false);

  check(
    'ABOVE_MAXIMUM_STATUS_CORRECT',
    above.status === 'SPREAD_ABOVE_MAXIMUM',
  );

  check(
    'ABOVE_MAXIMUM_VALUES_PRESERVED',
    above.midpoint === 100 && above.spread === 2 && above.spreadPercent === 2,
  );

  const crossedMarket = service.evaluate({
    symbol: 'AAPL',
    bidPrice: 101,
    askPrice: 100,
    maximumSpreadPercent: 5,
  });

  check('CROSSED_MARKET_BLOCKED', crossedMarket.allowed === false);

  check(
    'CROSSED_MARKET_STATUS_CORRECT',
    crossedMarket.status === 'INVALID_MARKET',
  );

  check(
    'CROSSED_MARKET_DERIVED_VALUES_NULL',
    crossedMarket.midpoint === null &&
      crossedMarket.spread === null &&
      crossedMarket.spreadPercent === null,
  );

  for (const bidPrice of [
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const result = service.evaluate({
      symbol: 'AAPL',
      bidPrice,
      askPrice: 101,
      maximumSpreadPercent: 5,
    });

    check(`INVALID_BID_BLOCKED_${String(bidPrice)}`, result.allowed === false);

    check(
      `INVALID_BID_STATUS_${String(bidPrice)}`,
      result.status === 'INVALID_BID',
    );

    check(
      `INVALID_BID_DERIVED_VALUES_NULL_${String(bidPrice)}`,
      result.midpoint === null &&
        result.spread === null &&
        result.spreadPercent === null,
    );
  }

  for (const askPrice of [
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const result = service.evaluate({
      symbol: 'AAPL',
      bidPrice: 99,
      askPrice,
      maximumSpreadPercent: 5,
    });

    check(`INVALID_ASK_BLOCKED_${String(askPrice)}`, result.allowed === false);

    check(
      `INVALID_ASK_STATUS_${String(askPrice)}`,
      result.status === 'INVALID_ASK',
    );

    check(
      `INVALID_ASK_DERIVED_VALUES_NULL_${String(askPrice)}`,
      result.midpoint === null &&
        result.spread === null &&
        result.spreadPercent === null,
    );
  }

  const overflow = service.evaluate({
    symbol: 'AAPL',
    bidPrice: Number.MAX_VALUE,
    askPrice: Number.MAX_VALUE,
    maximumSpreadPercent: 5,
  });

  check('OVERFLOW_BLOCKED', overflow.allowed === false);

  check('OVERFLOW_STATUS_CORRECT', overflow.status === 'INVALID_SPREAD');

  check(
    'OVERFLOW_DERIVED_VALUES_NULL',
    overflow.midpoint === null &&
      overflow.spread === null &&
      overflow.spreadPercent === null,
  );

  service.assertAllowed({
    symbol: 'AAPL',
    bidPrice: 99,
    askPrice: 101,
    maximumSpreadPercent: 2,
  });

  check('ASSERT_ALLOWED_PASSES', true);

  expectThrow('ASSERT_ALLOWED_REJECTS_WIDE_SPREAD', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      bidPrice: 99,
      askPrice: 101,
      maximumSpreadPercent: 1,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_CROSSED_MARKET', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      bidPrice: 101,
      askPrice: 100,
      maximumSpreadPercent: 5,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_INVALID_BID', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      bidPrice: Number.NaN,
      askPrice: 100,
      maximumSpreadPercent: 5,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_INVALID_ASK', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      bidPrice: 100,
      askPrice: Number.NaN,
      maximumSpreadPercent: 5,
    }),
  );

  for (const maximumSpreadPercent of [
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    expectThrow(
      `INVALID_MAXIMUM_REJECTED_${String(maximumSpreadPercent)}`,
      () =>
        service.evaluate({
          symbol: 'AAPL',
          bidPrice: 99,
          askPrice: 101,
          maximumSpreadPercent,
        }),
    );
  }

  for (const symbol of ['', '   ', 'A'.repeat(33)]) {
    expectThrow(`INVALID_SYMBOL_REJECTED_${JSON.stringify(symbol)}`, () =>
      service.evaluate({
        symbol,
        bidPrice: 99,
        askPrice: 101,
        maximumSpreadPercent: 5,
      }),
    );
  }

  const repeated = service.evaluate({
    symbol: 'AAPL',
    bidPrice: 99,
    askPrice: 101,
    maximumSpreadPercent: 2,
  });

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    repeated.symbol === allowed.symbol &&
      repeated.bidPrice === allowed.bidPrice &&
      repeated.askPrice === allowed.askPrice &&
      repeated.midpoint === allowed.midpoint &&
      repeated.spread === allowed.spread &&
      repeated.spreadPercent === allowed.spreadPercent &&
      repeated.maximumSpreadPercent === allowed.maximumSpreadPercent &&
      repeated.allowed === allowed.allowed &&
      repeated.status === allowed.status &&
      repeated.reason === allowed.reason,
  );

  console.log('PUNTO 206 VERIFICADO CORRECTAMENTE.');
  console.log('EXIT_CODE: 0');
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}

