import { Injectable } from '@nestjs/common';
import type {
  OperationalComponentState,
  OperationalStateSnapshot,
  OperationalStatus,
} from './operational-state.interface';

@Injectable()
export class OperationalStateService {
  private readonly startedAt = new Date().toISOString();

  private updatedAt = this.startedAt;

  private status: OperationalStatus = 'BLOCKED';

  private statusReason: string | undefined = 'System startup has not completed';

  private readonly components = new Map<string, OperationalComponentState>();

  setStatus(status: OperationalStatus, reason?: string): void {
    this.status = status;
    this.statusReason = reason;
    this.updatedAt = new Date().toISOString();
  }

  getStatus(): OperationalStatus {
    return this.status;
  }

  setComponentState(
    component: string,
    available: boolean,
    reason?: string,
  ): void {
    const updatedAt = new Date().toISOString();

    this.components.set(component, {
      available,
      reason,
      updatedAt,
    });

    this.updatedAt = updatedAt;
  }

  getComponentState(component: string): OperationalComponentState | undefined {
    const state = this.components.get(component);

    return state ? { ...state } : undefined;
  }

  removeComponent(component: string): void {
    if (this.components.delete(component)) {
      this.updatedAt = new Date().toISOString();
    }
  }

  getSnapshot(): OperationalStateSnapshot {
    return {
      status: this.status,
      statusReason: this.statusReason,
      startedAt: this.startedAt,
      updatedAt: this.updatedAt,
      components: Object.fromEntries(
        Array.from(this.components.entries(), ([name, state]) => [
          name,
          { ...state },
        ]),
      ),
    };
  }
}
