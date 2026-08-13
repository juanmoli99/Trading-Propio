export interface SymbolWhitelistEntry {
  readonly id: string;
  readonly symbol: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SymbolWhitelistEvaluation {
  readonly symbol: string;
  readonly whitelistEnabled: boolean;
  readonly allowed: boolean;
}
