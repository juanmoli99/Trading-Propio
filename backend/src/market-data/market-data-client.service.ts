import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import {
  AlpacaNetworkError,
  type AlpacaNetworkErrorCode,
} from '../alpaca/alpaca-network.error';
import { AlpacaRateLimitError } from '../alpaca/alpaca-rate-limit.error';
import type { TradingMode } from '../config/env.validation';
import { MarketDataCacheService } from './market-data-cache.service';
import { MarketDataRateLimitService } from './market-data-rate-limit.service';
import { MarketDataRequestDedupService } from './market-data-request-dedup.service';
import { MarketDataRequestRecoveryService } from './market-data-request-recovery.service';
import type {
  MarketDataHttpRequest,
  MarketDataHttpResponse,
} from './market-data.types';

interface AlpacaMarketDataCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
}

const MARKET_DATA_BASE_URL = 'https://data.alpaca.markets';

@Injectable()
export class MarketDataClientService implements OnModuleInit {
  private client!: AxiosInstance;

  private timeoutMs!: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimit: MarketDataRateLimitService,
    private readonly recovery: MarketDataRequestRecoveryService,
    private readonly cache: MarketDataCacheService,
    private readonly requestDedup: MarketDataRequestDedupService,
  ) {}

  onModuleInit(): void {
    const tradingMode =
      this.configService.get<TradingMode>('app.tradingMode') ?? 'PAPER';

    this.timeoutMs = this.resolveTimeoutMs();

    const credentials = this.resolveCredentials(tradingMode);

    this.client = axios.create({
      baseURL: MARKET_DATA_BASE_URL,
      timeout: this.timeoutMs,
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
      },
    });
  }

  getBaseUrl(): string {
    return MARKET_DATA_BASE_URL;
  }

  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  async request<T>(
    request: MarketDataHttpRequest,
  ): Promise<MarketDataHttpResponse<T>> {
    const path = this.normalizePath(request.path);

    const requestKey = this.buildRequestKey(path, request.query);

    if (request.cacheTtlMs !== undefined) {
      const cached = this.cache.get<MarketDataHttpResponse<T>>(requestKey);

      if (cached !== null) {
        return cached;
      }
    }

    const response = await this.requestDedup.execute(requestKey, async () =>
      this.fetchFromAlpaca<T>(path, request),
    );

    if (request.cacheTtlMs !== undefined) {
      this.cache.set(requestKey, response, request.cacheTtlMs);
    }

    return structuredClone(response);
  }

  private async fetchFromAlpaca<T>(
    path: string,
    request: MarketDataHttpRequest,
  ): Promise<MarketDataHttpResponse<T>> {
    return this.recovery.execute(request, () =>
      this.executeRequest<T>({
        method: 'GET',
        url: path,
        params: request.query,
      }),
    );
  }

  private async executeRequest<T>(
    config: AxiosRequestConfig,
  ): Promise<MarketDataHttpResponse<T>> {
    try {
      const response = await this.client.request<T>(config);

      const headers = this.normalizeHeaders(response.headers);

      this.rateLimit.updateFromHeaders(headers);

      return {
        status: response.status,
        data: response.data,
        headers,
      };
    } catch (error) {
      throw this.normalizeRequestError(error);
    }
  }

  private normalizeRequestError(error: unknown): unknown {
    if (!axios.isAxiosError(error)) {
      return error;
    }

    if (error.response) {
      const headers = this.normalizeHeaders(error.response.headers);

      this.rateLimit.updateFromHeaders(headers);

      if (error.response.status === 429) {
        this.rateLimit.recordRateLimitResponse();

        return new AlpacaRateLimitError(this.rateLimit.getSnapshot().resetAt, {
          cause: error,
        });
      }

      return error;
    }

    return new AlpacaNetworkError(
      this.classifyNetworkError(error),
      this.networkErrorMessage(error),
      {
        cause: error,
        retryable: true,
      },
    );
  }

  private buildRequestKey(
    path: string,
    query:
      | Readonly<Record<string, string | number | boolean | undefined>>
      | undefined,
  ): string {
    if (!query) {
      return path;
    }

    const parts = Object.entries(query)
      .filter(
        (entry): entry is [string, string | number | boolean] =>
          entry[1] !== undefined,
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      );

    if (parts.length === 0) {
      return path;
    }

    return `${path}?${parts.join('&')}`;
  }

  private classifyNetworkError(error: AxiosError): AlpacaNetworkErrorCode {
    switch (error.code) {
      case 'ECONNABORTED':
      case 'ETIMEDOUT':
        return 'TIMEOUT';

      case 'ECONNREFUSED':
        return 'CONNECTION_REFUSED';

      case 'ECONNRESET':
        return 'CONNECTION_RESET';

      case 'ENOTFOUND':
      case 'EAI_AGAIN':
        return 'DNS_FAILURE';

      case 'ENETUNREACH':
      case 'EHOSTUNREACH':
        return 'NETWORK_UNREACHABLE';

      default:
        return 'NETWORK_ERROR';
    }
  }

  private networkErrorMessage(error: AxiosError): string {
    const code = this.classifyNetworkError(error);

    switch (code) {
      case 'TIMEOUT':
        return 'Alpaca market data request timed out';

      case 'CONNECTION_REFUSED':
        return 'Alpaca market data connection was refused';

      case 'CONNECTION_RESET':
        return 'Alpaca market data connection was reset';

      case 'DNS_FAILURE':
        return 'Alpaca market data hostname could not be resolved';

      case 'NETWORK_UNREACHABLE':
        return 'Alpaca market data network is unreachable';

      default:
        return 'Alpaca market data network request failed';
    }
  }

  private resolveTimeoutMs(): number {
    const timeoutMs = this.configService.get<number>(
      'operational.defaultHttpTimeoutMs',
    );

    if (
      timeoutMs === undefined ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 100 ||
      timeoutMs > 120000
    ) {
      throw new Error('Invalid market data HTTP timeout configuration');
    }

    return timeoutMs;
  }

  private resolveCredentials(
    tradingMode: TradingMode,
  ): AlpacaMarketDataCredentials {
    const prefix = tradingMode === 'LIVE' ? 'alpaca.live' : 'alpaca.paper';

    const apiKey = this.configService.get<string>(`${prefix}.apiKey`);

    const apiSecret = this.configService.get<string>(`${prefix}.apiSecret`);

    if (!apiKey || !apiSecret) {
      throw new Error(
        `Alpaca market data credentials are missing for ${tradingMode}`,
      );
    }

    return {
      apiKey,
      apiSecret,
    };
  }

  private normalizePath(path: string): string {
    const trimmed = path.trim();

    if (!trimmed) {
      throw new Error('Market data request path is required');
    }

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('//')
    ) {
      throw new Error('Market data request path must be relative');
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  private normalizeHeaders(headers: unknown): Readonly<Record<string, string>> {
    if (typeof headers !== 'object' || headers === null) {
      return {};
    }

    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        normalized[key] = String(value);
      }
    }

    return normalized;
  }
}
