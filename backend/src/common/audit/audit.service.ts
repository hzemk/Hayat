import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';

export interface AuditRecord {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly req: Request,
  ) {}

  async record(entry: AuditRecord): Promise<void> {
    const xff = this.req.headers?.['x-forwarded-for'];
    const ipAddress =
      (Array.isArray(xff) ? xff[0] : xff?.split(',')[0].trim()) ??
      this.req.ip ??
      null;
    const userAgent =
      (this.req.headers?.['user-agent'] as string | undefined) ?? null;

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          ipAddress,
          userAgent,
          metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      // Audit must never break the request path; log and swallow.
      this.logger.error(
        `Audit write failed (${entry.action} ${entry.resource})`,
        err as Error,
      );
    }
  }
}
