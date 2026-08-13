import type {
  CorporateActionPendingQuery,
  CorporateActionPendingRecord,
} from './corporate-action-pending.types';

export const CORPORATE_ACTION_ENTRY_BLOCK_STATUSES = [
  'ALLOWED',
  'BLOCKED_AMBIGUOUS_CORPORATE_ACTION',
] as const;

export type CorporateActionEntryBlockStatus =
  (typeof CORPORATE_ACTION_ENTRY_BLOCK_STATUSES)[number];

export interface CorporateActionEntryBlockQuery {
  readonly symbol: string;
  readonly asOf?: Date;
  readonly end?: string;
}

export interface CorporateActionEntryBlockItem {
  readonly corporateActionId: string;
  readonly corporateActionType: CorporateActionPendingRecord['type'];
  readonly symbol: string | null;
  readonly processDate: Date;
  readonly reason: string;
}

export interface CorporateActionEntryBlockResult {
  readonly symbol: string;
  readonly asOf: Date;
  readonly status: CorporateActionEntryBlockStatus;
  readonly entryBlocked: boolean;
  readonly ambiguousActions: readonly CorporateActionEntryBlockItem[];
}

export type CorporateActionEntryBlockPendingQuery = CorporateActionPendingQuery;
