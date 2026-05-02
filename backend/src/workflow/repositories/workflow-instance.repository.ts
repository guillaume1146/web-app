import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowInstanceRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.workflowInstance.findUnique({
      where: { id },
      include: { template: true },
    });
  }

  async findByBooking(bookingId: string, bookingType: string) {
    return this.prisma.workflowInstance.findFirst({
      where: { bookingId, bookingType },
      include: { template: true },
    });
  }

  async findByUser(userId: string, role: 'patient' | 'provider', filters?: { currentStatus?: string; bookingType?: string }) {
    return this.prisma.workflowInstance.findMany({
      where: {
        ...(role === 'patient' ? { patientUserId: userId } : { providerUserId: userId }),
        currentStatus: filters?.currentStatus,
        bookingType: filters?.bookingType,
      },
      include: { template: { select: { id: true, name: true, providerType: true, serviceMode: true, steps: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(data: {
    templateId: string; bookingId: string; bookingType: string;
    currentStatus: string; patientUserId: string; providerUserId: string;
    serviceMode: string; metadata?: any; templateSnapshot?: any;
  }) {
    return this.prisma.workflowInstance.create({ data });
  }

  async updateStatus(id: string, data: {
    currentStatus: string; previousStatus: string | null;
    completedAt?: Date; cancelledAt?: Date;
  }) {
    return this.prisma.workflowInstance.update({ where: { id }, data });
  }
}
