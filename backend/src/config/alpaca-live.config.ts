import { registerAs } from '@nestjs/config';

export interface AlpacaLiveConfiguration {
  apiKey?: string;
  apiSecret?: string;
  baseUrl: string;
}

export default registerAs('alpaca.live', (): AlpacaLiveConfiguration => ({
  apiKey: process.env.ALPACA_LIVE_API_KEY,
  apiSecret: process.env.ALPACA_LIVE_API_SECRET,
  baseUrl: process.env.ALPACA_LIVE_BASE_URL ?? 'https://api.alpaca.markets',
}));
