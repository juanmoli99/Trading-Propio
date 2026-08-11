import { Injectable } from '@nestjs/common';
import { normalizeAlpacaClock } from './alpaca-clock.mapper';
import type { AlpacaClock } from './alpaca-clock.types';
import { AlpacaHttpClient } from './alpaca-http-client.service';

interface AlpacaClockApiResponse {
  timestamp?: unknown;
  is_open?: unknown;
  next_open?: unknown;
  next_close?: unknown;
}

@Injectable()
export class AlpacaClockService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async getClock(): Promise<AlpacaClock> {
    const response = await this.httpClient.request<AlpacaClockApiResponse>({
      method: 'GET',
      path: '/v2/clock',
      consumer: 'SYSTEM',
    });

    return normalizeAlpacaClock(response.data);
  }
}
