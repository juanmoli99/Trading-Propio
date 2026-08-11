import { Injectable } from '@nestjs/common';
import {
  normalizeAlpacaAsset,
  normalizeAlpacaAssets,
  type AlpacaAssetApiResponse,
} from './alpaca-asset.mapper';
import type { AlpacaAsset } from './alpaca-asset.types';
import { AlpacaHttpClient } from './alpaca-http-client.service';

@Injectable()
export class AlpacaAssetService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async getAsset(symbol: string): Promise<AlpacaAsset> {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    const response = await this.httpClient.request<AlpacaAssetApiResponse>({
      method: 'GET',
      path: `/v2/assets/${encodeURIComponent(normalizedSymbol)}`,
      consumer: 'SYSTEM',
    });

    return normalizeAlpacaAsset(response.data);
  }

  async getAssets(options?: {
    status?: 'active' | 'inactive';
    assetClass?: string;
  }): Promise<AlpacaAsset[]> {
    const response = await this.httpClient.request<AlpacaAssetApiResponse[]>({
      method: 'GET',
      path: '/v2/assets',
      consumer: 'SYSTEM',
      query: {
        status: options?.status,
        asset_class: options?.assetClass,
      },
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid Alpaca assets response');
    }

    return normalizeAlpacaAssets(response.data);
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized) {
      throw new Error('Alpaca asset symbol is required');
    }

    if (normalized.length > 32) {
      throw new Error('Invalid Alpaca asset symbol');
    }

    return normalized;
  }
}
