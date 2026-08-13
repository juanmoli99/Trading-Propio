export const CROSSOVER_TYPES = ['CROSS_ABOVE', 'CROSS_BELOW', 'NONE'] as const;

export type CrossoverType = (typeof CROSSOVER_TYPES)[number];

export interface CrossoverInput {
  readonly left: readonly number[];
  readonly right: readonly number[];
}

export interface CrossoverResult {
  readonly type: CrossoverType;
  readonly crossed: boolean;
  readonly previousLeft: number;
  readonly previousRight: number;
  readonly currentLeft: number;
  readonly currentRight: number;
}
