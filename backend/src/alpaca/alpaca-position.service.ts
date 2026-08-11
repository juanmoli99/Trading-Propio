import { Injectable } from '@nestjs/common';
import { AlpacaHttpClient } from './alpaca-http-client.service';
import {
  normalizeAlpacaPosition,
  normalizeAlpacaPositions,
  type AlpacaPositionApiResponse,
} from './alpaca-position.mapper';
import type { AlpacaPosition } from './alpaca-position.types';

@Injectable()
export class AlpacaPositionService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async getPositions(): Promise<AlpacaPosition[]> {
    const response = await this.httpClient.request<AlpacaPositionApiResponse[]>(
      {
        method: 'GET',
        path: '/v2/positions',
        consumer: 'SYSTEM',
      },
    );

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid Alpaca positions response');
    }

    return normalizeAlpacaPositions(response.data);
  }

  async getPosition(symbolOrAssetId: string): Promise<AlpacaPosition> {
    const identifier = symbolOrAssetId.trim();

    if (!identifier) {
      throw new Error('Alpaca position identifier is required');
    }

    const response = await this.httpClient.request<AlpacaPositionApiResponse>({
      method: 'GET',
      path: `/v2/positions/${encodeURIComponent(identifier)}`,
      consumer: 'SYSTEM',
    });

    return normalizeAlpacaPosition(response.data);
  }
}
