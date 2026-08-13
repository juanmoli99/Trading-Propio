export interface SymbolTemporaryBlockExpirationResult {
  readonly asOf: Date;
  readonly removedCount: number;
  readonly removedSymbols: readonly string[];
}
