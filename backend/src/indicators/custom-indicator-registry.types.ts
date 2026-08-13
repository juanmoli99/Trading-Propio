import type { Indicator } from './indicator.interface';

export interface RegisteredCustomIndicator {
  readonly name: string;
  readonly indicator: Indicator<unknown, unknown>;
}
