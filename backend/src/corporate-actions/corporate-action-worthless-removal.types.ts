export interface CorporateActionWorthlessRemoval {
  readonly id: string;
  readonly symbol: string;
  readonly processDate: Date;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface CorporateActionWorthlessRemovalQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface CorporateActionWorthlessRemovalResult {
  readonly symbol: string;
  readonly removals: readonly CorporateActionWorthlessRemoval[];
}
