export type AlpacaAccountMarginClassification =
  'LIMITED_MARGIN_1X' | 'REG_T_MARGIN_2X' | 'INTRADAY_MARGIN_4X';

export interface AlpacaAccountRestrictions {
  readonly tradingBlocked: boolean;
  readonly accountBlocked: boolean;
  readonly transfersBlocked: boolean;
  readonly tradeSuspendedByUser: boolean;
  readonly shortingDisabled: boolean;
  readonly leverageDisabled: boolean;
}

export interface AlpacaAccountCapabilities {
  readonly tradingAllowed: boolean;
  readonly transfersAllowed: boolean;
  readonly shortingAllowed: boolean;
  readonly leverageAllowed: boolean;
}

export interface AlpacaBuyingPower {
  readonly effective: string;
  readonly regT: string;
  readonly nonMarginable: string;
  readonly intradayMultiplier: number;
  readonly overnightMultiplier: number;
}

export interface AlpacaMarginRequirements {
  readonly initial: string;
  readonly maintenance: string;
  readonly previousMaintenance: string;
  readonly specialMemorandumAccount: string;
}

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

  readonly initialMargin: string;
  readonly maintenanceMargin: string;
  readonly lastMaintenanceMargin: string;
  readonly sma: string;

  readonly accountType: 'MARGIN';
  readonly marginClassification: AlpacaAccountMarginClassification;

  readonly restrictions: AlpacaAccountRestrictions;
  readonly capabilities: AlpacaAccountCapabilities;

  readonly buyingPowerSummary: AlpacaBuyingPower;
  readonly marginRequirements: AlpacaMarginRequirements;

  readonly tradingAllowed: boolean;
}
