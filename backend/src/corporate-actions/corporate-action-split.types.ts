export type CorporateActionSplitType =
  | 'forward_split'
  | 'reverse_split';

export interface CorporateActionSplit {
  readonly id: string;
  readonly type: CorporateActionSplitType;
  readonly symbol: string;
  readonly processDate: Date;
  readonly oldRate: number;
  readonly newRate: number;
  readonly shareFactor: number;
}

export interface CorporateActionSplitQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface CorporateActionSplitResult {
  readonly symbol: string;
  readonly splits: readonly CorporateActionSplit[];
}