import { registerAs } from '@nestjs/config';

export interface FinnhubConfiguration {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

export default registerAs('finnhub', (): FinnhubConfiguration => ({
  apiKey: process.env.FINNHUB_API_KEY ?? '',
  baseUrl: process.env.FINNHUB_BASE_URL ?? 'https://finnhub.io/api/v1',
  timeoutMs: Number(process.env.FINNHUB_TIMEOUT_MS ?? 10000),
}));
