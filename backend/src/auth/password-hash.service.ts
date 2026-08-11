import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const ARGON2_MEMORY_COST = 19456;
const ARGON2_TIME_COST = 2;
const ARGON2_PARALLELISM = 1;

@Injectable()
export class PasswordHashService {
  async hash(password: string): Promise<string> {
    if (password.length < 12) {
      throw new Error('Operator password must contain at least 12 characters');
    }

    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: ARGON2_MEMORY_COST,
      timeCost: ARGON2_TIME_COST,
      parallelism: ARGON2_PARALLELISM,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
