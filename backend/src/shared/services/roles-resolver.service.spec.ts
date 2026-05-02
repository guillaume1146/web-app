import { RolesResolverService } from './roles-resolver.service';

describe('RolesResolverService', () => {
  let service: RolesResolverService;
  let findMany: jest.Mock;

  const seedRoles = [
    { code: 'DOCTOR', cookieValue: 'doctor', slug: 'doctors', isActive: true },
    { code: 'NANNY', cookieValue: 'child-care-nurse', slug: 'childcare', isActive: true },
    { code: 'PHARMACIST', cookieValue: 'pharmacy', slug: 'pharmacists', isActive: true },
    { code: 'AUDIOLOGIST', cookieValue: 'audiologist', slug: 'audiologists', isActive: true },
  ];

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue(seedRoles);
    const prisma = { providerRole: { findMany } };
    service = new RolesResolverService(prisma as any);
    await service.refresh();
  });

  describe('cookieToCodeAsync', () => {
    it('resolves simple cookie value', async () => {
      expect(await service.cookieToCodeAsync('doctor')).toBe('DOCTOR');
    });
    it('resolves hyphenated cookie value', async () => {
      expect(await service.cookieToCodeAsync('child-care-nurse')).toBe('NANNY');
    });
    it('is case-insensitive on input', async () => {
      expect(await service.cookieToCodeAsync('DOCTOR')).toBe('DOCTOR');
    });
    it('returns null for unknown cookie', async () => {
      expect(await service.cookieToCodeAsync('unicorn')).toBeNull();
    });
    it('resolves a dynamically-added role (Audiologist) with no code change', async () => {
      expect(await service.cookieToCodeAsync('audiologist')).toBe('AUDIOLOGIST');
    });
  });

  describe('codeToCookieAsync', () => {
    it('resolves simple code', async () => {
      expect(await service.codeToCookieAsync('DOCTOR')).toBe('doctor');
    });
    it('is case-insensitive on input', async () => {
      expect(await service.codeToCookieAsync('doctor')).toBe('doctor');
    });
    it('resolves NANNY to child-care-nurse cookie', async () => {
      expect(await service.codeToCookieAsync('NANNY')).toBe('child-care-nurse');
    });
  });

  describe('signupToCodeAsync', () => {
    it('accepts slug', async () => {
      expect(await service.signupToCodeAsync('doctors')).toBe('DOCTOR');
    });
    it('accepts canonical code', async () => {
      expect(await service.signupToCodeAsync('DOCTOR')).toBe('DOCTOR');
    });
    it('accepts legacy alias pharmacy → PHARMACIST', async () => {
      expect(await service.signupToCodeAsync('pharmacy')).toBe('PHARMACIST');
    });
    it('accepts hardcoded legacy alias emergency → EMERGENCY_WORKER', async () => {
      expect(await service.signupToCodeAsync('emergency')).toBe('EMERGENCY_WORKER');
    });
  });

  describe('sync helpers', () => {
    it('return cached value without touching DB', () => {
      findMany.mockClear();
      expect(service.cookieToCodeSync('doctor')).toBe('DOCTOR');
      expect(service.codeToCookieSync('DOCTOR')).toBe('doctor');
      expect(findMany).not.toHaveBeenCalled();
    });
    it('return null for unknown inputs', () => {
      expect(service.cookieToCodeSync('unicorn')).toBeNull();
      expect(service.codeToCookieSync('UNICORN')).toBeNull();
    });
    it('findMany was called only once for refresh', () => {
      expect(findMany).toHaveBeenCalledTimes(1);
    });
  });
});
