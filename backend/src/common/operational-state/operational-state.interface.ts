export const operationalStatuses = [
  'READY',
  'DEGRADED',
  'BLOCKED',
  'EMERGENCY',
] as const;

export type OperationalStatus = (typeof operationalStatuses)[number];

export interface OperationalComponentState {
  available: boolean;
  reason?: string;
  updatedAt: string;
}

export interface OperationalStateSnapshot {
  status: OperationalStatus;
  statusReason?: string;
  startedAt: string;
  updatedAt: string;
  components: Readonly<Record<string, OperationalComponentState>>;
}
