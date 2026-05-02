import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Single write-only entry-point for recording admin mutations.
 * Failures are swallowed (logged) so an audit-write bug never breaks a real action —
 * but the log is the source of truth for compliance reviews.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);
  constructor(private prisma: PrismaService) {}

  async log(params: {
    adminId: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    details?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      await this.prisma.adminActionLog.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId ?? null,
          details: (params.details ?? null) as any,
        },
      });
    } catch (err) {
      this.logger.warn(`Audit write failed (${params.action}): ${(err as Error).message}`);
    }
  }

  /**
   * List recent audit entries for the admin dashboard.
   * Default newest-first. Optional filters by admin / action / target.
   */
  async list(params: {
    limit?: number;
    adminId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
  } = {}) {
    return this.prisma.adminActionLog.findMany({
      where: {
        ...(params.adminId && { adminId: params.adminId }),
        ...(params.action && { action: params.action }),
        ...(params.targetType && { targetType: params.targetType }),
        ...(params.targetId && { targetId: params.targetId }),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(params.limit ?? 100, 500),
    });
  }
}
