import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async list(providerType?: string, countryCode?: string) {
    const where: any = { isActive: true };
    if (providerType) where.providerType = providerType;
    if (countryCode) where.countryCode = countryCode;
    const programs = await this.prisma.healthProgram.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { sessions: { orderBy: { sortOrder: 'asc' } }, _count: { select: { enrollments: true } } },
    });
    return programs;
  }

  async create(body: any, userId: string) {
    const program = await this.prisma.healthProgram.create({
      data: { name: body.name, description: body.description, providerType: body.providerType as any, countryCode: body.countryCode, maxParticipants: body.maxParticipants || 50, durationWeeks: body.durationWeeks || 12, price: body.price || 0, createdByUserId: userId },
    });
    return program;
  }

  async enroll(programId: string, userId: string) {
    const program = await this.prisma.healthProgram.findUnique({ where: { id: programId }, include: { _count: { select: { enrollments: true } } } });
    if (!program) return { error: 'Program not found' };
    if (program._count.enrollments >= program.maxParticipants) return { error: 'Program is full' };
    const enrollment = await this.prisma.programEnrollment.create({ data: { programId, userId, status: 'active' } });
    return { data: enrollment };
  }
}
