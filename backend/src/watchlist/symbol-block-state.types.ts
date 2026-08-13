export const SYMBOL_BLOCK_STATUSES = [
  'ALLOWED',
  'BLACKLISTED',
  'NOT_WHITELISTED',
  'NOT_TRADABLE',
  'SUSPENDED',
  'TEMPORARILY_BLOCKED',
] as const;

export type SymbolBlockStatus = (typeof SYMBOL_BLOCK_STATUSES)[number];

export interface SymbolBlockStateResult {
  readonly symbol: string;
  readonly blocked: boolean;
  readonly status: SymbolBlockStatus;
  readonly reason: string | null;
  readonly temporaryBlockExpiresAt: Date | null;
}
