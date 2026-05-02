import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowStepLogRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    instanceId: string; fromStatus: string | null; toStatus: string;
    action: string; actionByUserId: string; actionByRole: string;
    label: string; message?: string; contentType?: string; contentData?: any;
    triggeredVideoCallId?: string; triggeredStockActions?: any; notificationId?: string;
  }) {
    return this.prisma.workflowStepLog.create({ data });
  }

  async findByInstance(instanceId: string) {
    return this.prisma.workflowStepLog.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
