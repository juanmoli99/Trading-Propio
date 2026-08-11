import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import type { TradingMode } from '../config/env.validation';
import type {
  AlpacaHttpRequest,
  AlpacaHttpResponse,
} from './alpaca-http.types';
import {
  AlpacaNetworkError,
  type AlpacaNetworkErrorCode,
} from './alpaca-network.error';
import { AlpacaRateLimitError } from './alpaca-rate-limit.error';
import { AlpacaRateLimitService } from './alpaca-rate-limit.service';
import { AlpacaRequestRecoveryService } from './alpaca-request-recovery.service';

interface AlpacaCredentials {
  apiKey: string;
  apiSecret: string;
}

@Injectable()
export class AlpacaHttpClient implements OnModuleInit {
  private client!: AxiosInstance;

  private tradingMode!: TradingMode;

  private baseUrl!: string;

  private timeoutMs!: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitService: AlpacaRateLimitService,
    private readonly recoveryService: AlpacaRequestRecoveryService,
  ) {}

  onModuleInit(): void {
    this.tradingMode =
      this.configService.get<TradingMode>('app.tradingMode') ?? 'PAPER';

    this.baseUrl = this.resolveBaseUrl(this.tradingMode);

    this.timeoutMs = this.resolveTimeoutMs();

    const credentials = this.resolveCredentials(this.tradingMode);

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
      },
    });
  }

  getTradingMode(): TradingMode {
    return this.tradingMode;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  async request<T>(request: AlpacaHttpRequest): Promise<AlpacaHttpResponse<T>> {
    const config: AxiosRequestConfig = {
      method: request.method,
      url: this.normalizePath(request.path),
      params: request.query,
      data: request.body,
    };

    return this.recoveryService.execute(request, () =>
      this.executeRequest<T>(config),
    );
  }

  private async executeRequest<T>(
    config: AxiosRequestConfig,
  ): Promise<AlpacaHttpResponse<T>> {
    try {
      const response = await this.client.request<T>(config);

      const headers = this.normalizeHeaders(response.headers);

      this.rateLimitService.updateFromHeaders(headers);

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

      this.rateLimitService.updateFromHeaders(headers);

      if (error.response.status === 429) {
        return new AlpacaRateLimitError(
          this.rateLimitService.getSnapshot().resetAt,
          {
            cause: error,
          },
        );
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
        return 'Alpaca request timed out';
      case 'CONNECTION_REFUSED':
        return 'Alpaca connection was refused';
      case 'CONNECTION_RESET':
        return 'Alpaca connection was reset';
      case 'DNS_FAILURE':
        return 'Alpaca hostname could not be resolved';
      case 'NETWORK_UNREACHABLE':
        return 'Alpaca network is unreachable';
      default:
        return 'Alpaca network request failed';
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
      throw new Error('Invalid Alpaca HTTP timeout configuration');
    }

    return timeoutMs;
  }

  private resolveBaseUrl(tradingMode: TradingMode): string {
    const configKey =
      tradingMode === 'LIVE' ? 'alpaca.live.baseUrl' : 'alpaca.paper.baseUrl';

    const baseUrl = this.configService.get<string>(configKey);

    if (!baseUrl) {
      throw new Error(`Alpaca base URL is missing for ${tradingMode}`);
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      throw new Error(`Invalid Alpaca base URL for ${tradingMode}`);
    }

    if (parsedUrl.protocol !== 'https:') {
      throw new Error(`Alpaca base URL must use HTTPS for ${tradingMode}`);
    }

    return parsedUrl.toString().replace(/\/$/, '');
  }

  private resolveCredentials(tradingMode: TradingMode): AlpacaCredentials {
    const prefix = tradingMode === 'LIVE' ? 'alpaca.live' : 'alpaca.paper';

    const apiKey = this.configService.get<string>(`${prefix}.apiKey`);

    const apiSecret = this.configService.get<string>(`${prefix}.apiSecret`);

    if (!apiKey || !apiSecret) {
      throw new Error(`Alpaca credentials are missing for ${tradingMode}`);
    }

    return {
      apiKey,
      apiSecret,
    };
  }

  private normalizePath(path: string): string {
    const trimmed = path.trim();

    if (!trimmed) {
      throw new Error('Alpaca request path is required');
    }

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('//')
    ) {
      throw new Error('Alpaca request path must be relative');
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
