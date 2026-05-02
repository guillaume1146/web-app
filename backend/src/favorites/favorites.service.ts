import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Saved-provider favorites. A user "stars" a provider; the list powers
 * the "My providers" shortcut for one-tap rebooking.
 */
@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    const favorites = await this.prisma.providerFavorite.findMany({
      where: { userId },
      include: {
        provider: {
          select: { id: true, firstName: true, lastName: true, userType: true, profileImage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map(f => ({
      id: f.id,
      providerId: f.providerId,
      createdAt: f.createdAt,
      provider: f.provider,
    }));
  }

  async isFavorited(userId: string, providerId: string): Promise<boolean> {
    const row = await this.prisma.providerFavorite.findUnique({
      where: { userId_providerId: { userId, providerId } },
      select: { id: true },
    });
    return !!row;
  }

  /** Idempotent toggle. Returns new favorited state. */
  async toggle(userId: string, providerId: string): Promise<{ favorited: boolean }> {
    const existing = await this.prisma.providerFavorite.findUnique({
      where: { userId_providerId: { userId, providerId } },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.providerFavorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await this.prisma.providerFavorite.create({ data: { userId, providerId } });
    return { favorited: true };
  }
}
