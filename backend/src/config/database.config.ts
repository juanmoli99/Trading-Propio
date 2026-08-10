import { registerAs } from '@nestjs/config';

export interface DatabaseConfiguration {
  url: string;
  directUrl: string;
}

export default registerAs('database', (): DatabaseConfiguration => ({
  url: process.env.DATABASE_URL ?? '',
  directUrl: process.env.DIRECT_URL ?? '',
}));
