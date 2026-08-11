import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../common/audit/audit.service';
import { LoginProtectionService } from './login-protection.service';
import { SessionService } from './session.service';
import { SingleOperatorService } from './single-operator.service';

export interface LoginResult {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
  operator: {
    id: string;
    username: string;
    displayName: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly operatorService: SingleOperatorService,
    private readonly sessionService: SessionService,
    private readonly loginProtectionService: LoginProtectionService,
    private readonly auditService: AuditService,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    await this.loginProtectionService.assertLoginAllowed();

    const operator = await this.operatorService.getOperator();

    const passwordValid = await this.operatorService.verifyPassword(password);

    if (!operator.enabled || operator.username !== username || !passwordValid) {
      await this.loginProtectionService.registerFailure();

      throw new UnauthorizedException('Invalid credentials');
    }

    await this.loginProtectionService.registerSuccess();

    const session = await this.sessionService.createSession();

    return {
      sessionToken: session.token,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
      operator: {
        id: operator.id,
        username: operator.username,
        displayName: operator.displayName,
      },
    };
  }

  async logout(sessionToken: string): Promise<void> {
    const revoked = await this.sessionService.revokeSession(sessionToken);

    if (!revoked) {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  async revokeAllSessions(): Promise<void> {
    try {
      const revokedCount = await this.sessionService.revokeAllSessions();

      await this.auditService.record({
        action: 'REVOKE_ALL_SESSIONS',
        outcome: 'SUCCESS',
        metadata: {
          revokedSessionCount: revokedCount,
        },
      });
    } catch (error) {
      await this.auditService.record({
        action: 'REVOKE_ALL_SESSIONS',
        outcome: 'FAILURE',
      });

      throw error;
    }
  }
}
