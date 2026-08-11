import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE_RESPONSE_KEYS = new Set([
  'password',
  'passwordhash',
  'sessiontoken',
  'tokenhash',
  'csrftoken',
  'csrftokenhash',
  'apikey',
  'apisecret',
  'databaseurl',
  'directurl',
  'authorization',
  'cookie',
  'setcookie',
]);

@Injectable()
export class SensitiveResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((response: unknown) => {
        if (this.containsSensitiveKey(response)) {
          throw new InternalServerErrorException('Unsafe response blocked');
        }

        return response;
      }),
    );
  }

  private containsSensitiveKey(
    value: unknown,
    visited = new WeakSet<object>(),
  ): boolean {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    if (value instanceof Date) {
      return false;
    }

    if (visited.has(value)) {
      return false;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      return value.some((item) => this.containsSensitiveKey(item, visited));
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      if (SENSITIVE_RESPONSE_KEYS.has(normalizedKey)) {
        return true;
      }

      if (this.containsSensitiveKey(nestedValue, visited)) {
        return true;
      }
    }

    return false;
  }
}
