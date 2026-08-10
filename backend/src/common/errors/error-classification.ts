export const errorCategories = [
  'VALIDATION',
  'DOMAIN',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'CONFIGURATION',
  'INFRASTRUCTURE',
  'NETWORK',
  'DATABASE',
  'BROKER',
  'MARKET_DATA',
  'RISK',
  'OPERATIONAL_SAFETY',
  'UNKNOWN',
] as const;

export const errorSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export type ErrorCategory = (typeof errorCategories)[number];
export type ErrorSeverity = (typeof errorSeverities)[number];

export interface ClassifiedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
}
