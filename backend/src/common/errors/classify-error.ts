import { HttpException, HttpStatus } from '@nestjs/common';
import { AlpacaNetworkError } from '../../alpaca/alpaca-network.error';
import type {
  ClassifiedError,
  ErrorCategory,
  ErrorSeverity,
} from './error-classification';

function classifyHttpStatus(statusCode: number): ClassifiedError {
  if (statusCode === HttpStatus.UNAUTHORIZED) {
    return {
      category: 'AUTHENTICATION',
      severity: 'MEDIUM',
    };
  }

  if (statusCode === HttpStatus.FORBIDDEN) {
    return {
      category: 'AUTHORIZATION',
      severity: 'HIGH',
    };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return {
      category: 'VALIDATION',
      severity: 'LOW',
    };
  }

  return {
    category: 'INFRASTRUCTURE',
    severity: 'HIGH',
  };
}

export function classifyError(exception: unknown): ClassifiedError {
  if (exception instanceof AlpacaNetworkError) {
    return {
      category: 'NETWORK',
      severity: 'HIGH',
    };
  }

  if (exception instanceof HttpException) {
    return classifyHttpStatus(exception.getStatus());
  }

  return {
    category: 'UNKNOWN',
    severity: 'CRITICAL',
  };
}

export function isErrorCategory(value: string): value is ErrorCategory {
  return [
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
  ].includes(value);
}

export function isErrorSeverity(value: string): value is ErrorSeverity {
  return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(value);
}
