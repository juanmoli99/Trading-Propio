import type {
  NumericIndicatorResult,
  PeriodIndicatorInput,
} from './indicator.types';

export type SmaInput = PeriodIndicatorInput;

export interface SmaResult extends NumericIndicatorResult {
  readonly period: number;
}
