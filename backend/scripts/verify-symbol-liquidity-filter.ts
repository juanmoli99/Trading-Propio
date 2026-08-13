import { SymbolDollarVolumeFilterService } from '../src/watchlist/symbol-dollar-volume-filter.service';
import { SymbolLiquidityFilterService } from '../src/watchlist/symbol-liquidity-filter.service';
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
  const service = new SymbolLiquidityFilterService(
    new SymbolVolumeFilterService(),
    new SymbolDollarVolumeFilterService(),
  );

  const allowed = service.evaluate({
    symbol: '  aapl  ',
    price: 150,
    volume: 1000000,
    minimumVolume: 500000,
    minimumDollarVolume: 100000000,
  });

  check('SYMBOL_NORMALIZED', allowed.symbol === 'AAPL');

  check('PRICE_PRESERVED', allowed.price === 150);

  check('VOLUME_PRESERVED', allowed.volume === 1000000);

  check('DOLLAR_VOLUME_CALCULATED', allowed.dollarVolume === 150000000);

  check('MINIMUM_VOLUME_PRESERVED', allowed.minimumVolume === 500000);

  check(
    'MINIMUM_DOLLAR_VOLUME_PRESERVED',
    allowed.minimumDollarVolume === 100000000,
  );

  check('LIQUIDITY_ALLOWED', allowed.allowed === true);

  check('LIQUIDITY_STATUS_CORRECT', allowed.status === 'ALLOWED');

  check('VOLUME_STATUS_ALLOWED', allowed.volumeStatus === 'ALLOWED');

  check(
    'DOLLAR_VOLUME_STATUS_ALLOWED',
    allowed.dollarVolumeStatus === 'ALLOWED',
  );

  check('ALLOWED_REASON_PRESENT', allowed.reason.length > 0);

  const boundaries = service.evaluate({
    symbol: 'AAPL',
    price: 100,
    volume: 1000000,
    minimumVolume: 1000000,
    minimumDollarVolume: 100000000,
  });

  check('BOTH_MINIMUM_BOUNDARIES_ALLOWED', boundaries.allowed === true);

  const volumeFailure = service.evaluate({
    symbol: 'AAPL',
    price: 500,
    volume: 999999,
    minimumVolume: 1000000,
    minimumDollarVolume: 100000000,
  });

  check('VOLUME_FAILURE_BLOCKED', volumeFailure.allowed === false);

  check(
    'VOLUME_FAILURE_STATUS_CORRECT',
    volumeFailure.status === 'VOLUME_FILTER_FAILED',
  );

  check(
    'VOLUME_FAILURE_INNER_STATUS_CORRECT',
    volumeFailure.volumeStatus === 'VOLUME_BELOW_MINIMUM',
  );

  check(
    'VOLUME_FAILURE_DOLLAR_VOLUME_STILL_EVALUATED',
    volumeFailure.dollarVolume === 499999500,
  );

  check(
    'VOLUME_FAILURE_REASON_PRESENT',
    volumeFailure.reason.includes('VOLUME_BELOW_MINIMUM'),
  );

  const dollarFailure = service.evaluate({
    symbol: 'AAPL',
    price: 10,
    volume: 1000000,
    minimumVolume: 500000,
    minimumDollarVolume: 50000000,
  });

  check('DOLLAR_VOLUME_FAILURE_BLOCKED', dollarFailure.allowed === false);

  check(
    'DOLLAR_VOLUME_FAILURE_STATUS_CORRECT',
    dollarFailure.status === 'DOLLAR_VOLUME_FILTER_FAILED',
  );

  check(
    'DOLLAR_VOLUME_FAILURE_VOLUME_ALLOWED',
    dollarFailure.volumeStatus === 'ALLOWED',
  );

  check(
    'DOLLAR_VOLUME_FAILURE_INNER_STATUS_CORRECT',
    dollarFailure.dollarVolumeStatus === 'DOLLAR_VOLUME_BELOW_MINIMUM',
  );

  check(
    'DOLLAR_VOLUME_FAILURE_REASON_PRESENT',
    dollarFailure.reason.includes('DOLLAR_VOLUME_BELOW_MINIMUM'),
  );

  const invalidVolume = service.evaluate({
    symbol: 'AAPL',
    price: 100,
    volume: null,
    minimumVolume: 1000000,
    minimumDollarVolume: 100000000,
  });

  check('INVALID_VOLUME_BLOCKED', invalidVolume.allowed === false);

  check(
    'INVALID_VOLUME_TAKES_PRECEDENCE',
    invalidVolume.status === 'VOLUME_FILTER_FAILED',
  );

  check(
    'INVALID_VOLUME_STATUS_PRESERVED',
    invalidVolume.volumeStatus === 'INVALID_VOLUME',
  );

  const invalidPrice = service.evaluate({
    symbol: 'AAPL',
    price: Number.NaN,
    volume: 1000000,
    minimumVolume: 500000,
    minimumDollarVolume: 100000000,
  });

  check('INVALID_PRICE_BLOCKED', invalidPrice.allowed === false);

  check(
    'INVALID_PRICE_CLASSIFIED_AS_DOLLAR_VOLUME_FAILURE',
    invalidPrice.status === 'DOLLAR_VOLUME_FILTER_FAILED',
  );

  check(
    'INVALID_PRICE_INNER_STATUS_PRESERVED',
    invalidPrice.dollarVolumeStatus === 'INVALID_PRICE',
  );

  service.assertAllowed({
    symbol: 'AAPL',
    price: 150,
    volume: 1000000,
    minimumVolume: 500000,
    minimumDollarVolume: 100000000,
  });

  check('ASSERT_ALLOWED_PASSES', true);

  expectThrow('ASSERT_ALLOWED_REJECTS_VOLUME_FAILURE', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: 500,
      volume: 100,
      minimumVolume: 1000000,
      minimumDollarVolume: 1000,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_DOLLAR_VOLUME_FAILURE', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: 1,
      volume: 1000000,
      minimumVolume: 500000,
      minimumDollarVolume: 100000000,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_INVALID_PRICE', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: Number.NaN,
      volume: 1000000,
      minimumVolume: 500000,
      minimumDollarVolume: 100000000,
    }),
  );

  expectThrow('ASSERT_ALLOWED_REJECTS_INVALID_VOLUME', () =>
    service.assertAllowed({
      symbol: 'AAPL',
      price: 100,
      volume: null,
      minimumVolume: 500000,
      minimumDollarVolume: 100000000,
    }),
  );

  for (const symbol of ['', '   ', 'A'.repeat(33)]) {
    expectThrow(`INVALID_SYMBOL_REJECTED_${JSON.stringify(symbol)}`, () =>
      service.evaluate({
        symbol,
        price: 100,
        volume: 1000000,
        minimumVolume: 500000,
        minimumDollarVolume: 100000000,
      }),
    );
  }

  const repeated = service.evaluate({
    symbol: 'AAPL',
    price: 150,
    volume: 1000000,
    minimumVolume: 500000,
    minimumDollarVolume: 100000000,
  });

  check(
    'REPEATED_EVALUATION_DETERMINISTIC',
    repeated.symbol === allowed.symbol &&
      repeated.price === allowed.price &&
      repeated.volume === allowed.volume &&
      repeated.dollarVolume === allowed.dollarVolume &&
      repeated.minimumVolume === allowed.minimumVolume &&
      repeated.minimumDollarVolume === allowed.minimumDollarVolume &&
      repeated.allowed === allowed.allowed &&
      repeated.status === allowed.status &&
      repeated.volumeStatus === allowed.volumeStatus &&
      repeated.dollarVolumeStatus === allowed.dollarVolumeStatus &&
      repeated.reason === allowed.reason,
  );

  console.log('PUNTO 205 VERIFICADO CORRECTAMENTE.');
  console.log('EXIT_CODE: 0');
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  console.log('EXIT_CODE: 1');
  process.exitCode = 1;
}
