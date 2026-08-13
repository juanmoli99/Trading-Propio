import {
  CORPORATE_ACTION_TYPES,
  type CorporateActionRecord,
  type CorporateActionType,
} from './corporate-actions.types';

export type CorporateActionsApiResponse =
  Readonly<Record<string, unknown>>;

export function normalizeCorporateActionsResponse(
  value: CorporateActionsApiResponse,
): {
  actions: CorporateActionRecord[];
  nextPageToken: string | null;
} {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error('Invalid Alpaca corporate actions response');
  }

  const actions: CorporateActionRecord[] = [];

  for (const type of CORPORATE_ACTION_TYPES) {
    const key = toResponseKey(type);
    const group = value[key];

    if (group === undefined || group === null) {
      continue;
    }

    if (!Array.isArray(group)) {
      throw new Error(
        `Invalid Alpaca corporate actions group: ${key}`,
      );
    }

    for (const item of group) {
      actions.push(normalizeCorporateAction(item, type));
    }
  }

  return {
    actions,
    nextPageToken: optionalPageToken(value.next_page_token),
  };
}

function normalizeCorporateAction(
  value: unknown,
  type: CorporateActionType,
): CorporateActionRecord {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `Invalid Alpaca corporate action item: ${type}`,
    );
  }

  const raw = { ...(value as Record<string, unknown>) };

  return {
    id: requireString(raw.id, 'id'),
    type,
    symbol: optionalString(raw.symbol),
    processDate: optionalDate(raw.process_date, 'process_date'),
    raw,
  };
}

function toResponseKey(type: CorporateActionType): string {
  switch (type) {
    case 'reverse_split':
      return 'reverse_splits';

    case 'forward_split':
      return 'forward_splits';

    case 'unit_split':
      return 'unit_splits';

    case 'cash_dividend':
      return 'cash_dividends';

    case 'stock_dividend':
      return 'stock_dividends';

    case 'spin_off':
      return 'spin_offs';

    case 'cash_merger':
      return 'cash_mergers';

    case 'stock_merger':
      return 'stock_mergers';

    case 'stock_and_cash_merger':
      return 'stock_and_cash_mergers';

    case 'redemption':
      return 'redemptions';

    case 'name_change':
      return 'name_changes';

    case 'worthless_removal':
      return 'worthless_removals';

    case 'rights_distribution':
      return 'rights_distributions';

    case 'reorganization':
      return 'reorganizations';

    case 'partial_call':
      return 'partial_calls';
  }
}

function requireString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new Error(
      `Invalid Alpaca corporate action field: ${field}`,
    );
  }

  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(
      'Invalid Alpaca corporate action symbol',
    );
  }

  const normalized = value.trim();

  return normalized.length > 0
    ? normalized.toUpperCase()
    : null;
}

function optionalDate(
  value: unknown,
  field: string,
): Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new Error(
      `Invalid Alpaca corporate action date: ${field}`,
    );
  }

  const date = new Date(`${value.trim()}T00:00:00.000Z`);

  if (!Number.isFinite(date.getTime())) {
    throw new Error(
      `Invalid Alpaca corporate action date: ${field}`,
    );
  }

  return date;
}

function optionalPageToken(
  value: unknown,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new Error(
      'Invalid Alpaca corporate actions page token',
    );
  }

  return value.trim();
}