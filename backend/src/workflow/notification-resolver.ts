import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationVariables, StepNotification } from './types';

@Injectable()
export class WorkflowNotificationResolver {
  constructor(private prisma: PrismaService) {}

  interpolate(template: string, variables: Partial<NotificationVariables>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }
    return result;
  }

  async resolve(params: {
    workflowTemplateId: string; statusCode: string; targetRole: 'patient' | 'provider';
    defaultNotification: StepNotification | null | undefined;
    createdByProviderId?: string | null; variables: Partial<NotificationVariables>;
  }): Promise<{ title: string; message: string } | null> {
    const { workflowTemplateId, statusCode, targetRole, defaultNotification, createdByProviderId, variables } = params;

    if (createdByProviderId) {
      const custom = await this.prisma.workflowNotificationTemplate.findFirst({
        where: { workflowTemplateId, statusCode, targetRole, createdByProviderId },
      });
      if (custom) return { title: this.interpolate(custom.title, variables), message: this.interpolate(custom.message, variables) };
    }

    const adminCustom = await this.prisma.workflowNotificationTemplate.findFirst({
      where: { workflowTemplateId, statusCode, targetRole, createdByAdminId: { not: null }, createdByProviderId: null },
    });
    if (adminCustom) return { title: this.interpolate(adminCustom.title, variables), message: this.interpolate(adminCustom.message, variables) };

    if (defaultNotification) {
      return { title: this.interpolate(defaultNotification.title, variables), message: this.interpolate(defaultNotification.message, variables) };
    }

    return null;
  }

  async buildVariables(params: {
    patientUserId: string; providerUserId: string; bookingId: string; statusLabel: string; amount?: number;
  }): Promise<Partial<NotificationVariables>> {
    const [patient, provider] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: params.patientUserId }, select: { firstName: true, lastName: true } }),
      this.prisma.user.findUnique({ where: { id: params.providerUserId }, select: { firstName: true, lastName: true, userType: true } }),
    ]);
    return {
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Patient',
      providerName: provider ? `${provider.firstName} ${provider.lastName}` : 'Provider',
      providerType: provider?.userType ?? '',
      bookingId: params.bookingId,
      status: params.statusLabel,
      amount: params.amount !== undefined ? `${params.amount} Rs` : '',
      serviceName: '', scheduledAt: '', eta: '', actionBy: '',
    };
  }
}
