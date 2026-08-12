import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TradingMode } from '../config/env.validation';
import { MarketDataHaltTransitionAuditService } from './market-data-halt-transition-audit.service';
import {
  normalizeMarketDataLuld,
  type AlpacaLuldMessage,
} from './market-data-luld.mapper';
import type {
  MarketDataLuldStatus,
  MarketDataLuldStatusSnapshot,
} from './market-data-luld.types';
import {
  normalizeMarketDataTradingStatus,
  type AlpacaTradingStatusMessage,
} from './market-data-trading-status.mapper';
import type {
  MarketDataTradingStatus,
  MarketDataTradingStatusSnapshot,
} from './market-data-trading-status.types';
import type { MarketDataFeed } from './market-data.types';

interface MarketDataCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
}

@Injectable()
export class MarketDataTradingStatusService implements OnModuleDestroy {
  private socket: WebSocket | null = null;

  private feed: MarketDataFeed | null = null;

  private authenticated = false;

  private readonly subscriptions = new Set<string>();

  private readonly statuses = new Map<string, MarketDataTradingStatus>();

  private readonly previousStatuses = new Map<
    string,
    MarketDataTradingStatus
  >();

  private readonly luldStatuses = new Map<string, MarketDataLuldStatus>();

  constructor(
    private readonly configService: ConfigService,
    private readonly haltTransitionAudit?: MarketDataHaltTransitionAuditService,
  ) {}

  async connect(feed: MarketDataFeed = 'iex'): Promise<void> {
    this.validateFeed(feed);

    if (this.socket !== null) {
      throw new Error('Market data trading status stream is already connected');
    }

    const credentials = this.resolveCredentials();
    const socket = new WebSocket(this.buildStreamUrl(feed));

    this.socket = socket;
    this.feed = feed;
    this.authenticated = false;

    socket.addEventListener('message', (event) => {
      void this.handleMessage(event.data).catch(() => {
        this.disconnect();
      });
    });

    try {
      await this.authenticate(socket, credentials);
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  subscribeSymbol(symbol: string): void {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    this.assertConnected();

    if (this.subscriptions.has(normalizedSymbol)) {
      return;
    }

    this.socket?.send(
      JSON.stringify({
        action: 'subscribe',
        statuses: [normalizedSymbol],
        lulds: [normalizedSymbol],
      }),
    );

    this.subscriptions.add(normalizedSymbol);
  }

  unsubscribeSymbol(symbol: string): void {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    this.assertConnected();

    if (!this.subscriptions.has(normalizedSymbol)) {
      return;
    }

    this.socket?.send(
      JSON.stringify({
        action: 'unsubscribe',
        statuses: [normalizedSymbol],
        lulds: [normalizedSymbol],
      }),
    );

    this.subscriptions.delete(normalizedSymbol);
  }

  getTradingStatus(symbol: string): MarketDataTradingStatusSnapshot {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    const status = this.statuses.get(normalizedSymbol);
    const previousStatus = this.previousStatuses.get(normalizedSymbol);

    return {
      symbol: normalizedSymbol,
      status: status ? this.cloneStatus(status) : null,
      previousStatus: previousStatus
        ? this.cloneStatus(previousStatus)
        : null,
    };
  }

  getLuldStatus(symbol: string): MarketDataLuldStatusSnapshot {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    const luld = this.luldStatuses.get(normalizedSymbol);

    return {
      symbol: normalizedSymbol,
      luld: luld ? this.cloneLuld(luld) : null,
    };
  }

  getSubscribedSymbols(): string[] {
    return [...this.subscriptions].sort();
  }

  ingestMessageForVerification(
    value: AlpacaTradingStatusMessage,
    feed: MarketDataFeed,
    receivedAt: Date = new Date(),
  ): MarketDataTradingStatus {
    const status = normalizeMarketDataTradingStatus(
      value,
      feed,
      receivedAt,
    );

    this.storeStatus(status);

    return this.cloneStatus(status);
  }

  async ingestMessageAndAuditForVerification(
    value: AlpacaTradingStatusMessage,
    feed: MarketDataFeed,
    receivedAt: Date = new Date(),
  ): Promise<MarketDataTradingStatus> {
    const status = normalizeMarketDataTradingStatus(
      value,
      feed,
      receivedAt,
    );

    await this.storeStatusAndAudit(status);

    return this.cloneStatus(status);
  }

  ingestLuldForVerification(
    value: AlpacaLuldMessage,
    feed: MarketDataFeed,
    receivedAt: Date = new Date(),
  ): MarketDataLuldStatus {
    const luld = normalizeMarketDataLuld(
      value,
      feed,
      receivedAt,
    );

    this.storeLuld(luld);

    return this.cloneLuld(luld);
  }

  disconnect(): void {
    const socket = this.socket;

    this.socket = null;
    this.feed = null;
    this.authenticated = false;
    this.subscriptions.clear();

    if (
      socket !== null &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close();
    }
  }

  onModuleDestroy(): void {
    this.disconnect();
  }

  private authenticate(
    socket: WebSocket,
    credentials: MarketDataCredentials,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Alpaca market data stream authentication timed out'));
      }, 10_000);

      const cleanup = (): void => {
        clearTimeout(timeout);
        socket.removeEventListener('message', onMessage);
        socket.removeEventListener('error', onError);
        socket.removeEventListener('close', onClose);
      };

      const onError = (): void => {
        cleanup();
        reject(new Error('Alpaca market data stream connection failed'));
      };

      const onClose = (): void => {
        cleanup();
        reject(
          new Error('Alpaca market data stream closed before authentication'),
        );
      };

      const onMessage = (event: MessageEvent): void => {
        const messages = this.parseMessages(event.data);

        for (const message of messages) {
          if (
            message.T === 'success' &&
            message.msg === 'authenticated'
          ) {
            this.authenticated = true;
            cleanup();
            resolve();
            return;
          }

          if (message.T === 'error') {
            cleanup();
            reject(
              new Error(
                `Alpaca market data stream authentication failed: ${
                  typeof message.msg === 'string'
                    ? message.msg
                    : 'unknown error'
                }`,
              ),
            );
            return;
          }
        }
      };

      socket.addEventListener('message', onMessage);
      socket.addEventListener('error', onError);
      socket.addEventListener('close', onClose);

      socket.addEventListener(
        'open',
        () => {
          socket.send(
            JSON.stringify({
              action: 'auth',
              key: credentials.apiKey,
              secret: credentials.apiSecret,
            }),
          );
        },
        { once: true },
      );
    });
  }

  private async handleMessage(data: unknown): Promise<void> {
    if (this.feed === null) {
      return;
    }

    const messages = this.parseMessages(data);

    for (const message of messages) {
      if (message.T === 's') {
        const status = normalizeMarketDataTradingStatus(
          message,
          this.feed,
        );

        await this.storeStatusAndAudit(status);
        continue;
      }

      if (message.T === 'l') {
        const luld = normalizeMarketDataLuld(
          message,
          this.feed,
        );

        this.storeLuld(luld);
      }
    }
  }

  private storeStatus(status: MarketDataTradingStatus): boolean {
    const existing = this.statuses.get(status.symbol);

    if (
      existing !== undefined &&
      status.timestamp.getTime() <= existing.timestamp.getTime()
    ) {
      return false;
    }

    if (existing !== undefined) {
      this.previousStatuses.set(
        status.symbol,
        this.cloneStatus(existing),
      );
    }

    this.statuses.set(status.symbol, this.cloneStatus(status));

    return true;
  }

  private async storeStatusAndAudit(
    status: MarketDataTradingStatus,
  ): Promise<void> {
    const previous = this.statuses.get(status.symbol);

    const accepted = this.storeStatus(status);

    if (!accepted || this.haltTransitionAudit === undefined) {
      return;
    }

    await this.haltTransitionAudit.recordAcceptedTransition(
      previous ? this.cloneStatus(previous) : null,
      this.cloneStatus(status),
    );
  }

  private storeLuld(luld: MarketDataLuldStatus): void {
    const existing = this.luldStatuses.get(luld.symbol);

    if (
      existing !== undefined &&
      luld.timestamp.getTime() < existing.timestamp.getTime()
    ) {
      return;
    }

    this.luldStatuses.set(
      luld.symbol,
      this.cloneLuld(luld),
    );
  }

  private parseMessages(data: unknown): Record<string, unknown>[] {
    let parsed: unknown;

    try {
      if (typeof data === 'string') {
        parsed = JSON.parse(data);
      } else if (data instanceof ArrayBuffer) {
        parsed = JSON.parse(Buffer.from(data).toString('utf8'));
      } else {
        return [];
      }
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    );
  }

  private assertConnected(): void {
    if (
      this.socket === null ||
      this.socket.readyState !== WebSocket.OPEN ||
      !this.authenticated
    ) {
      throw new Error(
        'Market data trading status stream is not authenticated',
      );
    }
  }

  private buildStreamUrl(feed: MarketDataFeed): string {
    return `wss://stream.data.alpaca.markets/v2/${feed}`;
  }

  private resolveCredentials(): MarketDataCredentials {
    const tradingMode =
      this.configService.get<TradingMode>('app.tradingMode') ?? 'PAPER';

    const prefix =
      tradingMode === 'LIVE' ? 'alpaca.live' : 'alpaca.paper';

    const apiKey = this.configService.get<string>(`${prefix}.apiKey`);

    const apiSecret = this.configService.get<string>(
      `${prefix}.apiSecret`,
    );

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

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();

    if (
      !normalized ||
      normalized.length > 32 ||
      /\s/.test(normalized)
    ) {
      throw new Error('Invalid market data trading status symbol');
    }

    return normalized;
  }

  private validateFeed(feed: MarketDataFeed): void {
    if (feed !== 'iex' && feed !== 'sip') {
      throw new Error('Invalid market data trading status feed');
    }
  }

  private cloneStatus(
    status: MarketDataTradingStatus,
  ): MarketDataTradingStatus {
    return {
      ...status,
      timestamp: new Date(status.timestamp),
      receivedAt: new Date(status.receivedAt),
    };
  }

  private cloneLuld(
    luld: MarketDataLuldStatus,
  ): MarketDataLuldStatus {
    return {
      ...luld,
      timestamp: new Date(luld.timestamp),
      receivedAt: new Date(luld.receivedAt),
    };
  }
}