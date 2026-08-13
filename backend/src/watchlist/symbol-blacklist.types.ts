export interface SymbolBlacklistEntry {
  readonly id: string;
  readonly symbol: string;
  readonly reason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SymbolBlacklistEvaluation {
  readonly symbol: string;
  readonly blocked: boolean;
  readonly reason: string | null;
}
