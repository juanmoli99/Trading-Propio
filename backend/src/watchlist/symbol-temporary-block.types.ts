export interface SymbolTemporaryBlockEntry {
  readonly id: string;
  readonly symbol: string;
  readonly reason: string;
  readonly blockedAt: Date;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SymbolTemporaryBlockEvaluation {
  readonly symbol: string;
  readonly blocked: boolean;
  readonly reason: string | null;
  readonly blockedAt: Date | null;
  readonly expiresAt: Date | null;
}
