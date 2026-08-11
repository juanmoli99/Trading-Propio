import type { AlpacaAccount } from './alpaca-account.types';

interface AlpacaAccountApiResponse {
  id?: unknown;
  status?: unknown;
  currency?: unknown;
  cash?: unknown;
  equity?: unknown;
  buying_power?: unknown;
  portfolio_value?: unknown;

  trading_blocked?: unknown;
  account_blocked?: unknown;
  transfers_blocked?: unknown;
  trade_suspended_by_user?: unknown;

  shorting_enabled?: unknown;
  multiplier?: unknown;
  regt_buying_power?: unknown;
  non_marginable_buying_power?: unknown;
}

export function normalizeAlpacaAccount(
  value: AlpacaAccountApiResponse,
): AlpacaAccount {
  const status = requireString(value.status, 'status');

  const tradingBlocked = requireBoolean(
    value.trading_blocked,
    'trading_blocked',
  );

  const accountBlocked = requireBoolean(
    value.account_blocked,
    'account_blocked',
  );

  const transfersBlocked = requireBoolean(
    value.transfers_blocked,
    'transfers_blocked',
  );

  const tradeSuspendedByUser = requireBoolean(
    value.trade_suspended_by_user,
    'trade_suspended_by_user',
  );

  return {
    id: requireString(value.id, 'id'),

    status,

    currency: requireString(value.currency, 'currency'),

    cash: requireFinancialString(value.cash, 'cash'),

    equity: requireFinancialString(value.equity, 'equity'),

    buyingPower: requireFinancialString(value.buying_power, 'buying_power'),

    portfolioValue: requireFinancialString(
      value.portfolio_value,
      'portfolio_value',
    ),

    tradingBlocked,
    accountBlocked,
    transfersBlocked,
    tradeSuspendedByUser,

    shortingEnabled: requireBoolean(value.shorting_enabled, 'shorting_enabled'),

    multiplier: requireNonNegativeFinancialString(
      value.multiplier,
      'multiplier',
    ),

    regtBuyingPower: requireFinancialString(
      value.regt_buying_power,
      'regt_buying_power',
    ),

    nonMarginableBuyingPower: requireFinancialString(
      value.non_marginable_buying_power,
      'non_marginable_buying_power',
    ),

    tradingAllowed:
      status === 'ACTIVE' &&
      !tradingBlocked &&
      !accountBlocked &&
      !tradeSuspendedByUser,
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid Alpaca account field: ${field}`);
  }

  return value;
}

function requireFinancialString(value: unknown, field: string): string {
  const result = requireString(value, field);

  const parsed = Number(result);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Alpaca financial field: ${field}`);
  }

  return result;
}

function requireNonNegativeFinancialString(
  value: unknown,
  field: string,
): string {
  const result = requireFinancialString(value, field);

  if (Number(result) < 0) {
    throw new Error(`Invalid Alpaca financial field: ${field}`);
  }

  return result;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid Alpaca account field: ${field}`);
  }

  return value;
}
