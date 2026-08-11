import { Injectable } from '@nestjs/common';
import { CorrelationContextService } from '../correlation/correlation-context.service';
import { PrismaService } from '../../database/prisma.service';

const PRIMARY_OPERATOR_ID = 'primary';

export type CriticalAuditAction = 'REAUTHENTICATION' | 'REVOKE_ALL_SESSIONS';

export type CriticalAuditOutcome = 'SUCCESS' | 'FAILURE';

export interface RecordAuditEventInput {
  action: CriticalAuditAction;
  outcome: CriticalAuditOutcome;
  metadata?: Record<string, string | number | boolean | null>;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correlationContext: CorrelationContextService,
  ) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    const correlationId = this.correlationContext.getCorrelationId();

    await this.prisma.auditEvent.create({
      data: {
        operatorId: PRIMARY_OPERATOR_ID,
        action: input.action,
        outcome: input.outcome,
        correlationId,
        metadata: input.metadata,
      },
    });
  }
}
