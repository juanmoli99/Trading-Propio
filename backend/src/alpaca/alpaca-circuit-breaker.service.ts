import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AlpacaNetworkError } from './alpaca-network.error';
import { AlpacaRateLimitError } from './alpaca-rate-limit.error';
import { AlpacaCircuitOpenError } from './alpaca-circuit-open.error';
import type {
  AlpacaCircuitBreakerSnapshot,
  AlpacaCircuitBreakerState,
} from './alpaca-circuit-breaker.types';

@Injectable()
export class AlpacaCircuitBreakerService {
  private readonly failureThreshold: number;

  private readonly openDurationMs: number;

  private state: AlpacaCircuitBreakerState = 'CLOSED';

  private consecutiveFailures = 0;

  private openedAt: Date | null = null;

  private halfOpenProbeInFlight = false;

  constructor(private readonly configService: ConfigService) {
    this.failureThreshold = this.resolveFailureThreshold();

    this.openDurationMs = this.resolveOpenDurationMs();
  }

  beforeRequest(): void {
    if (this.state === 'CLOSED') {
      return;
    }

    if (this.state === 'OPEN') {
      const retryAt = this.getRetryAt();

      if (Date.now() < retryAt.getTime()) {
        throw new AlpacaCircuitOpenError(retryAt);
      }

      this.state = 'HALF_OPEN';
      this.halfOpenProbeInFlight = false;
    }

    if (this.halfOpenProbeInFlight) {
      throw new AlpacaCircuitOpenError(this.getRetryAt());
    }

    this.halfOpenProbeInFlight = true;
  }

  recordSuccess(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.halfOpenProbeInFlight = false;
  }

  recordFailure(error: unknown): void {
    if (!this.shouldCountFailure(error)) {
      this.recordSuccess();
      return;
    }

    this.halfOpenProbeInFlight = false;

    if (this.state === 'HALF_OPEN') {
      this.openCircuit();
      return;
    }

    this.consecutiveFailures += 1;

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  getSnapshot(): AlpacaCircuitBreakerSnapshot {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      failureThreshold: this.failureThreshold,
      openedAt: this.openedAt ? new Date(this.openedAt) : null,
      retryAt: this.state === 'OPEN' ? this.getRetryAt() : null,
    };
  }

  private openCircuit(): void {
    this.state = 'OPEN';
    this.openedAt = new Date();
    this.halfOpenProbeInFlight = false;
  }

  private getRetryAt(): Date {
    const baseTime = this.openedAt?.getTime() ?? Date.now();

    return new Date(baseTime + this.openDurationMs);
  }

  private shouldCountFailure(error: unknown): boolean {
    if (error instanceof AlpacaNetworkError) {
      return true;
    }

    if (error instanceof AlpacaRateLimitError) {
      return false;
    }

    if (axios.isAxiosError(error) && error.response) {
      return error.response.status >= 500 && error.response.status <= 599;
    }

    return false;
  }

  private resolveFailureThreshold(): number {
    const value = this.configService.get<number>(
      'operational.alpacaCircuitBreakerFailureThreshold',
    );

    if (
      value === undefined ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 50
    ) {
      throw new Error('Invalid Alpaca circuit breaker failure threshold');
    }

    return value;
  }

  private resolveOpenDurationMs(): number {
    const value = this.configService.get<number>(
      'operational.alpacaCircuitBreakerOpenMs',
    );

    if (
      value === undefined ||
      !Number.isInteger(value) ||
      value < 1000 ||
      value > 300000
    ) {
      throw new Error('Invalid Alpaca circuit breaker open duration');
    }

    return value;
  }
}
