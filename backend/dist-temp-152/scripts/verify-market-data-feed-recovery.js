"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const operational_state_service_1 = require("../src/common/operational-state/operational-state.service");
const market_data_feed_recovery_service_1 = require("../src/market-data/market-data-feed-recovery.service");
const market_data_health_service_1 = require("../src/market-data/market-data-health.service");
const operationalState = new operational_state_service_1.OperationalStateService();
const healthService = new market_data_health_service_1.MarketDataHealthService(operationalState);
const recoveryService = new market_data_feed_recovery_service_1.MarketDataFeedRecoveryService(healthService, operationalState);
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
}
catch {
    entryBlockedDuringRecovery = true;
}
recoveryService.recordSuccessfulRequest();
const repeatedSuccessSnapshot = recoveryService.getSnapshot();
const assertions = {
    INITIAL_STATUS_STABLE: initialSnapshot.status === 'STABLE',
    OUTAGE_STATUS_SET: outageSnapshot.status === 'OUTAGE',
    OUTAGE_TIMESTAMP_SET: typeof outageSnapshot.outageStartedAt === 'string',
    OUTAGE_HEALTH_UNAVAILABLE: outageHealth.status === 'UNAVAILABLE',
    OUTAGE_BLOCKS_ENTRIES: healthService.isEntryBlocked() === true,
    RECONNECTION_ENTERS_RECOVERING: recoveringSnapshot.status === 'RECOVERING',
    RECONNECTED_TIMESTAMP_SET: typeof recoveringSnapshot.reconnectedAt === 'string',
    RECOVERY_HEALTH_REMAINS_BLOCKING: recoveringHealth.status === 'STALE',
    ENTRY_BLOCKED_DURING_RECOVERY: entryBlockedDuringRecovery,
    SUCCESS_DOES_NOT_AUTO_COMPLETE_RECOVERY: repeatedSuccessSnapshot.status === 'RECOVERING',
    OUTAGE_TIMESTAMP_PRESERVED: repeatedSuccessSnapshot.outageStartedAt ===
        outageSnapshot.outageStartedAt,
    RECONNECTED_TIMESTAMP_PRESERVED: repeatedSuccessSnapshot.reconnectedAt ===
        recoveringSnapshot.reconnectedAt,
};
for (const [name, passed] of Object.entries(assertions)) {
    console.log(`${name}: ${passed}`);
}
if (!Object.values(assertions).every(Boolean)) {
    console.error('PUNTO 152 FALLÓ.');
    process.exit(1);
}
console.log('PUNTO 152 VERIFICADO CORRECTAMENTE.');
