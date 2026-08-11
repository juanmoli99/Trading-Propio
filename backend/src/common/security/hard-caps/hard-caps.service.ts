import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HardCapsSnapshot } from './hard-caps.interface';

@Injectable()
export class HardCapsService {
  private readonly caps: HardCapsSnapshot;

  constructor(private readonly configService: ConfigService) {
    this.caps = Object.freeze({
      maxOrderNotional: this.readCap('hardCaps.maxOrderNotional'),
      maxTotalCapital: this.readCap('hardCaps.maxTotalCapital'),
      maxDailyLoss: this.readCap('hardCaps.maxDailyLoss'),
      maxDrawdownPercent: this.readCap('hardCaps.maxDrawdownPercent'),
    });
  }

  getSnapshot(): HardCapsSnapshot {
    return this.caps;
  }

  capOrderNotional(requested: number): number {
    return Math.min(requested, this.caps.maxOrderNotional);
  }

  capTotalCapital(requested: number): number {
    return Math.min(requested, this.caps.maxTotalCapital);
  }

  capDailyLoss(requested: number): number {
    return Math.min(requested, this.caps.maxDailyLoss);
  }

  capDrawdownPercent(requested: number): number {
    return Math.min(requested, this.caps.maxDrawdownPercent);
  }

  private readCap(key: string): number {
    const value = this.configService.get<number>(key);

    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid backend hard cap: ${key}`);
    }

    return value;
  }
}
