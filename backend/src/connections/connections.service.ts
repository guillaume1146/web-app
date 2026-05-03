import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  profileImage: true,
  userType: true,
} as const;

@Injectable()
export class ConnectionsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, status?: string) {
    const where: any = { OR: [{ senderId: userId }, { receiverId: userId }] };
    if (status) where.status = status;
    return this.prisma.userConnection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: USER_SELECT },
        receiver: { select: USER_SELECT },
      },
    });
  }

  async suggestions(userId: string, take: number, skip = 0) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { regionId: true },
    });

    const existing = await this.prisma.userConnection.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      select: { senderId: true, receiverId: true },
    });

    const excludeIds = new Set<string>([userId]);
    existing.forEach((c) => {
      excludeIds.add(c.senderId);
      excludeIds.add(c.receiverId);
    });

    const where = {
      id: { notIn: Array.from(excludeIds) },
      accountStatus: 'active',
      ...(currentUser?.regionId ? { regionId: currentUser.regionId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { ...USER_SELECT, address: true },
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, hasMore: skip + take < total };
  }

  async create(senderId: string, receiverId: string) {
    return this.prisma.userConnection.create({
      data: { senderId, receiverId, status: 'pending' },
    });
  }

  async findById(id: string) {
    return this.prisma.userConnection.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.userConnection.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    return this.prisma.userConnection.delete({ where: { id } });
  }
}
