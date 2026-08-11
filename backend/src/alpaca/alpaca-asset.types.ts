export interface AlpacaAsset {
  readonly id: string;
  readonly assetClass: string;
  readonly exchange: string;
  readonly symbol: string;
  readonly name: string;
  readonly status: string;
  readonly tradable: boolean;
  readonly fractionable: boolean;
  readonly shortable: boolean;
  readonly easyToBorrow: boolean;
}
