import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesService } from './favorites.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      providerFavorite: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [FavoritesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(FavoritesService);
  });

  describe('list', () => {
    it('returns favourites with provider fields', async () => {
      prisma.providerFavorite.findMany.mockResolvedValueOnce([
        { id: 'F1', providerId: 'P1', createdAt: new Date(),
          provider: { id: 'P1', firstName: 'Ada', lastName: 'L', userType: 'DOCTOR', profileImage: null } },
      ]);
      const res = await service.list('U1');
      expect(res).toHaveLength(1);
      expect(res[0].provider.firstName).toBe('Ada');
    });
  });

  describe('isFavorited', () => {
    it('returns true when row exists', async () => {
      prisma.providerFavorite.findUnique.mockResolvedValueOnce({ id: 'F1' });
      expect(await service.isFavorited('U1', 'P1')).toBe(true);
    });
    it('returns false when row missing', async () => {
      prisma.providerFavorite.findUnique.mockResolvedValueOnce(null);
      expect(await service.isFavorited('U1', 'P1')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('creates a row when none exists → favorited: true', async () => {
      prisma.providerFavorite.findUnique.mockResolvedValueOnce(null);
      prisma.providerFavorite.create.mockResolvedValueOnce({});
      const res = await service.toggle('U1', 'P1');
      expect(res.favorited).toBe(true);
      expect(prisma.providerFavorite.create).toHaveBeenCalled();
    });

    it('deletes existing row → favorited: false', async () => {
      prisma.providerFavorite.findUnique.mockResolvedValueOnce({ id: 'F1' });
      prisma.providerFavorite.delete.mockResolvedValueOnce({});
      const res = await service.toggle('U1', 'P1');
      expect(res.favorited).toBe(false);
      expect(prisma.providerFavorite.delete).toHaveBeenCalledWith({ where: { id: 'F1' } });
    });

    it('is idempotent from the caller\'s perspective (toggle twice returns to original state)', async () => {
      prisma.providerFavorite.findUnique.mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'F1' });
      prisma.providerFavorite.create.mockResolvedValueOnce({});
      prisma.providerFavorite.delete.mockResolvedValueOnce({});
      const first = await service.toggle('U1', 'P1');
      const second = await service.toggle('U1', 'P1');
      expect(first.favorited).toBe(true);
      expect(second.favorited).toBe(false);
    });
  });
});
