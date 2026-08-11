import { registerAs } from '@nestjs/config';

export interface CorsConfiguration {
  allowedOrigins: string[];
}

export default registerAs('cors', (): CorsConfiguration => {
  const configuredOrigins =
    process.env.CORS_ALLOWED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  if (
    process.env.NODE_ENV === 'development' &&
    configuredOrigins.length === 0
  ) {
    return {
      allowedOrigins: ['http://localhost:5173'],
    };
  }

  return {
    allowedOrigins: configuredOrigins,
  };
});
