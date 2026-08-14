import { OperationalStateService } from '../src/common/operational-state/operational-state.service';
import { MarketDataHealthService } from '../src/market-data/market-data-health.service';

const operationalState = new OperationalStateService();
const service = new MarketDataHealthService(operationalState);

function throws(callback: () => void): boolean {
  try {
    callback();
    return false;
  } catch {
    return true;
  }
}

const initialBlocked = service.isEntryBlocked();
const initialThrows = throws(() => service.assertEntryAllowed());

service.evaluate({
  available: false,
  stale: false,
  inconsistent: false,
});

const unavailableBlocked = service.isEntryBlocked();
const unavailableThrows = throws(() => service.assertEntryAllowed());

service.evaluate({
  available: true,
  stale: true,
  inconsistent: false,
});

const staleBlocked = service.isEntryBlocked();
const staleThrows = throws(() => service.assertEntryAllowed());

service.evaluate({
  available: true,
  stale: false,
  inconsistent: false,
});

const healthyAllowed =
  service.isEntryBlocked() === false &&
  throws(() => service.assertEntryAllowed()) === false;

service.evaluate({
  available: true,
  stale: false,
  inconsistent: true,
});

const inconsistentDoesNotUseStaleUnavailableBlock =
  service.isEntryBlocked() === false;

const assertions = {
  INITIAL_FAIL_CLOSED: initialBlocked,
  INITIAL_ASSERT_BLOCKS: initialThrows,
  UNAVAILABLE_BLOCKS_ENTRY: unavailableBlocked,
  UNAVAILABLE_ASSERT_BLOCKS: unavailableThrows,
  STALE_BLOCKS_ENTRY: staleBlocked,
  STALE_ASSERT_BLOCKS: staleThrows,
  HEALTHY_ALLOWS_ENTRY: healthyAllowed,
  INCONSISTENT_NOT_CLASSIFIED_AS_STALE_OR_UNAVAILABLE:
    inconsistentDoesNotUseStaleUnavailableBlock,
};

for (const [name, passed] of Object.entries(assertions)) {
  console.log(`${name}: ${passed}`);
}

if (!Object.values(assertions).every(Boolean)) {
  console.error('PUNTO 151 FALLÃ“.');
  process.exit(1);
}

console.log('PUNTO 151 VERIFICADO CORRECTAMENTE.');
