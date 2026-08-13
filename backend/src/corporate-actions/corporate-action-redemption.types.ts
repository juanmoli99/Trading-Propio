export interface CorporateActionRedemption {
  readonly id: string;
  readonly symbol: string;
  readonly processDate: Date;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface CorporateActionRedemptionQuery {
  readonly symbol: string;
  readonly start?: string;
  readonly end?: string;
}

export interface CorporateActionRedemptionResult {
  readonly symbol: string;
  readonly redemptions: readonly CorporateActionRedemption[];
}
