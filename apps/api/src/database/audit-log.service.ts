import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export interface AuditRecord {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(record: AuditRecord): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: record.actorId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        requestId: record.requestId,
        metadata: record.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
