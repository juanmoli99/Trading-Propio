import { Injectable } from '@nestjs/common';
import { AlpacaHttpClient } from './alpaca-http-client.service';
import { normalizeAlpacaAccount } from './alpaca-account.mapper';
import type { AlpacaAccount } from './alpaca-account.types';

interface AlpacaAccountApiResponse {
  id?: unknown;
  status?: unknown;
  currency?: unknown;
  cash?: unknown;
  equity?: unknown;
  buying_power?: unknown;
  portfolio_value?: unknown;

  trading_blocked?: unknown;
  account_blocked?: unknown;
  transfers_blocked?: unknown;
  trade_suspended_by_user?: unknown;

  shorting_enabled?: unknown;
  multiplier?: unknown;
  regt_buying_power?: unknown;
  non_marginable_buying_power?: unknown;
}

@Injectable()
export class AlpacaAccountService {
  constructor(private readonly httpClient: AlpacaHttpClient) {}

  async getAccount(): Promise<AlpacaAccount> {
    const response = await this.httpClient.request<AlpacaAccountApiResponse>({
      method: 'GET',
      path: '/v2/account',
      consumer: 'SYSTEM',
    });

    return normalizeAlpacaAccount(response.data);
  }
}
