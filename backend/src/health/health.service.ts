import { Injectable } from '@nestjs/common';
import { OperationalStateService } from '../common/operational-state/operational-state.service';

@Injectable()
export class HealthService {
  constructor(private readonly operationalState: OperationalStateService) {}

  getHealth() {
    return {
      service: 'trading-backend',
      timestamp: new Date().toISOString(),
      operational: this.operationalState.getSnapshot(),
    };
  }

  getReadiness() {
    const operational = this.operationalState.getSnapshot();

    return {
      ready: operational.status === 'READY',
      status: operational.status,
      reason: operational.statusReason,
      timestamp: new Date().toISOString(),
    };
  }

  getLiveness() {
    return {
      alive: true,
      service: 'trading-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    };
  }
}
