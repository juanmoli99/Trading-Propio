import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../common/audit/audit.service';
import { SessionService } from './session.service';
import { SingleOperatorService } from './single-operator.service';

@Injectable()
export class ReauthenticationService {
  constructor(
    private readonly operatorService: SingleOperatorService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  async reauthenticate(sessionToken: string, password: string): Promise<void> {
    const validPassword = await this.operatorService.verifyPassword(password);

    if (!validPassword) {
      await this.auditService.record({
        action: 'REAUTHENTICATION',
        outcome: 'FAILURE',
        metadata: {
          reason: 'INVALID_CREDENTIALS',
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      await this.sessionService.markReauthenticated(sessionToken);

      await this.auditService.record({
        action: 'REAUTHENTICATION',
        outcome: 'SUCCESS',
      });
    } catch (error) {
      await this.auditService.record({
        action: 'REAUTHENTICATION',
        outcome: 'FAILURE',
        metadata: {
          reason: 'INVALID_SESSION',
        },
      });

      throw error;
    }
  }
}
