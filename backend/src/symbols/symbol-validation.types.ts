import type { TradingSymbol } from './symbol.types';

export const SYMBOL_VALIDATION_STATUSES = [
  'VALID',
  'INACTIVE',
  'NOT_TRADABLE',
] as const;

export type SymbolValidationStatus =
  (typeof SYMBOL_VALIDATION_STATUSES)[number];

export interface ValidateTradingSymbolInput {
  readonly symbol: string;
}

export interface SymbolValidationResult {
  readonly symbol: TradingSymbol;
  readonly validationStatus: SymbolValidationStatus;
}
