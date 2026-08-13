export interface CorporateActionSpinOff {
  readonly id: string;
  readonly symbol: string;
  readonly processDate: Date;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface CorporateActionSpinOffQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface CorporateActionSpinOffResult {
  readonly symbol: string;
  readonly spinOffs: readonly CorporateActionSpinOff[];
}
