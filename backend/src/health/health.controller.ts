import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { HealthService } from './health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('ready')
  getReadiness() {
    const readiness = this.healthService.getReadiness();

    if (!readiness.ready) {
      const { ServiceUnavailableException } = require('@nestjs/common');

      throw new ServiceUnavailableException(readiness);
    }

    return readiness;
  }

  @Get('live')
  getLiveness() {
    return this.healthService.getLiveness();
  }
}
