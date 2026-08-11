export interface AlpacaAccount {
  readonly id: string;
  readonly status: string;
  readonly currency: string;
  readonly cash: string;
  readonly equity: string;
  readonly buyingPower: string;
  readonly portfolioValue: string;

  readonly tradingBlocked: boolean;
  readonly accountBlocked: boolean;
  readonly transfersBlocked: boolean;
  readonly tradeSuspendedByUser: boolean;

  readonly shortingEnabled: boolean;
  readonly multiplier: string;
  readonly regtBuyingPower: string;
  readonly nonMarginableBuyingPower: string;

  readonly tradingAllowed: boolean;
}
