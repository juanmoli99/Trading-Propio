import {
  validateNoDuplicateBars,
  validateNoDuplicateQuotes,
  validateNoDuplicateTrades,
} from './src/market-data/market-data-duplicates';

function check(name: string, fn: () => void, shouldThrow = false): void {
  try {
    fn();

    if (shouldThrow) {
      console.log(`${name}: false`);
      return;
    }

    console.log(`${name}: true`);
  } catch {
    console.log(`${name}: ${shouldThrow}`);
  }
}

const date1 = new Date('2026-08-10T14:30:00Z');
const date2 = new Date('2026-08-10T14:31:00Z');

const bar1 = {
  timestamp: date1,
  open: 100,
  high: 102,
  low: 99,
  close: 101,
  volume: 1000,
  tradeCount: 10,
  vwap: 100.5,
};

const bar2 = {
  ...bar1,
  timestamp: date2,
};

const quote1 = {
  timestamp: date1,
  askExchange: 'V',
  askPrice: 101,
  askSize: 10,
  bidExchange: 'V',
  bidPrice: 100,
  bidSize: 10,
  conditions: ['R'],
  tape: 'C',
};

const quote2 = {
  ...quote1,
  timestamp: date2,
};

const trade1 = {
  timestamp: date1,
  exchange: 'V',
  price: 100,
  size: 10,
  conditions: ['@'],
  id: 1,
  tape: 'C',
};

const trade2 = {
  ...trade1,
  timestamp: date2,
  id: 2,
};

check('UNIQUE_BARS_ACCEPTED', () =>
  validateNoDuplicateBars([bar1, bar2]),
);

check(
  'DUPLICATE_BARS_BLOCKED',
  () => validateNoDuplicateBars([bar1, bar1]),
  true,
);

check('UNIQUE_QUOTES_ACCEPTED', () =>
  validateNoDuplicateQuotes([quote1, quote2]),
);

check(
  'DUPLICATE_QUOTES_BLOCKED',
  () => validateNoDuplicateQuotes([quote1, quote1]),
  true,
);

check('UNIQUE_TRADES_ACCEPTED', () =>
  validateNoDuplicateTrades([trade1, trade2]),
);

check(
  'DUPLICATE_TRADES_BLOCKED',
  () => validateNoDuplicateTrades([trade1, trade1]),
  true,
);

check('EMPTY_COLLECTIONS_ACCEPTED', () => {
  validateNoDuplicateBars([]);
  validateNoDuplicateQuotes([]);
  validateNoDuplicateTrades([]);
});

check('SINGLE_ITEMS_ACCEPTED', () => {
  validateNoDuplicateBars([bar1]);
  validateNoDuplicateQuotes([quote1]);
  validateNoDuplicateTrades([trade1]);
});
