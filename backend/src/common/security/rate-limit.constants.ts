export const RATE_LIMITS = {
  DEFAULT: {
    limit: 100,
    ttl: 60000,
  },

  LOGIN: {
    limit: 5,
    ttl: 60000,
  },

  SENSITIVE: {
    limit: 10,
    ttl: 60000,
  },

  CRITICAL: {
    limit: 3,
    ttl: 60000,
  },
} as const;
