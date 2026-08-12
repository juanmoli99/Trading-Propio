import { ConfigService } from '@nestjs/config';
import { OperationalStateService } from '../src/common/operational-state/operational-state.service';
import { MarketDataAgeService } from '../src/market-data/market-data-age.service';
import { MarketDataFeedRecoveryService } from '../src/market-data/market-data-feed-recovery.service';
import { MarketDataHealthService } from '../src/market-data/market-data-health.service';

const operationalState = new OperationalStateService();

const healthService = new MarketDataHealthService(operationalState);

const ageService = new MarketDataAgeService(
  new ConfigService({
    marketData: {
      maxAgeMs: 120_000,
    },
  }),
);

const recoveryService = new MarketDataFeedRecoveryService(
  healthService,
  operationalState,
  ageService,
);

const initialSnapshot = recoveryService.getSnapshot();

recoveryService.recordUnavailable();

const outageSnapshot = recoveryService.getSnapshot();
const outageHealth = healthService.getSnapshot();

recoveryService.recordSuccessfulRequest();

const recoveringSnapshot = recoveryService.getSnapshot();
const recoveringHealth = healthService.getSnapshot();

let entryBlockedDuringRecovery = false;

try {
  healthService.assertEntryAllowed();
} catch {
  entryBlockedDuringRecovery = true;
}

const reconnectedAt = new Date(
  recoveringSnapshot.reconnectedAt ?? 'invalid',
);

const beforeReconnectTimestamp = new Date(
  reconnectedAt.getTime() - 1,
);

const beforeReconnectAccepted = recoveryService.completeWarmup(
  beforeReconnectTimestamp,
  reconnectedAt,
);

const afterOldWarmupAttempt = recoveryService.getSnapshot();

const freshPostReconnectTimestamp = new Date(
  reconnectedAt.getTime() + 1_000,
);

const referenceTimestamp = new Date(
  freshPostReconnectTimestamp.getTime() + 60_000,
);

const warmupCompleted = recoveryService.completeWarmup(
  freshPostReconnectTimestamp,
  referenceTimestamp,
);

const stableSnapshot = recoveryService.getSnapshot();
const stableHealth = healthService.getSnapshot();

let entryAllowedAfterWarmup = true;

try {
  healthService.assertEntryAllowed();
} catch {
  entryAllowedAfterWarmup = false;
}

const assertions = {
  INITIAL_STATUS_STABLE:
    initialSnapshot.status === 'STABLE',

  OUTAGE_STATUS_SET:
    outageSnapshot.status === 'OUTAGE',

  OUTAGE_HEALTH_UNAVAILABLE:
    outageHealth.status === 'UNAVAILABLE',

  RECONNECTION_ENTERS_RECOVERING:
    recoveringSnapshot.status === 'RECOVERING',

  RECOVERY_HEALTH_BLOCKING:
    recoveringHealth.status === 'STALE',

  ENTRY_BLOCKED_DURING_RECOVERY:
    entryBlockedDuringRecovery,

  PRE_RECONNECTION_DATA_REJECTED:
    beforeReconnectAccepted === false,

  PRE_RECONNECTION_DATA_KEEPS_RECOVERING:
    afterOldWarmupAttempt.status === 'RECOVERING',

  VALID_WARMUP_COMPLETES:
    warmupCompleted === true,

  STATUS_STABLE_AFTER_WARMUP:
    stableSnapshot.status === 'STABLE',

  WARMUP_COMPLETED_TIMESTAMP_SET:
    typeof stableSnapshot.warmupCompletedAt === 'string',

  HEALTH_HEALTHY_AFTER_WARMUP:
    stableHealth.status === 'HEALTHY',

  ENTRY_ALLOWED_AFTER_WARMUP:
    entryAllowedAfterWarmup,
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  console.error('PUNTO 153 FALLÓ.');
  process.exit(1);
}

console.log('PUNTO 153 VERIFICADO CORRECTAMENTE.');