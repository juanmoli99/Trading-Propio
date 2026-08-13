import type {
  NumericIndicatorResult,
  PeriodIndicatorInput,
} from './indicator.types';

export type EmaInput = PeriodIndicatorInput;

export interface EmaResult extends NumericIndicatorResult {
  readonly period: number;
  readonly multiplier: number;
}
