import { registerAs } from '@nestjs/config';

export interface AlpacaPaperConfiguration {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

export default registerAs('alpaca.paper', (): AlpacaPaperConfiguration => ({
  apiKey: process.env.ALPACA_PAPER_API_KEY ?? '',
  apiSecret: process.env.ALPACA_PAPER_API_SECRET ?? '',
  baseUrl:
    process.env.ALPACA_PAPER_BASE_URL ?? 'https://paper-api.alpaca.markets',
}));
