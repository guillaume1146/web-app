import { RequiredDocumentsService } from './required-documents.service';

describe('RequiredDocumentsService', () => {
  let service: RequiredDocumentsService;
  let findMany: jest.Mock;
  let signupToCodeAsync: jest.Mock;

  beforeEach(() => {
    findMany = jest.fn();
    signupToCodeAsync = jest.fn();
    const prisma = { requiredDocumentConfig: { findMany } } as any;
    const resolver = { signupToCodeAsync } as any;
    service = new RequiredDocumentsService(prisma, resolver);
  });

  it('returns [] when no rows exist for a known role', async () => {
    signupToCodeAsync.mockResolvedValue('DOCTOR');
    findMany.mockResolvedValue([]);
    const result = await service.listForRole('doctor');
    expect(result).toEqual([]);
  });

  it('returns flat array when userType provided', async () => {
    signupToCodeAsync.mockResolvedValue('DOCTOR');
    findMany.mockResolvedValue([
      { userType: 'DOCTOR', documentName: 'Medical License', required: true },
      { userType: 'DOCTOR', documentName: 'ID Card', required: true },
    ]);
    const result = await service.listForRole('doctor');
    expect(result).toEqual([
      { documentName: 'Medical License', required: true },
      { documentName: 'ID Card', required: true },
    ]);
  });

  it('returns grouped map when no userType provided', async () => {
    findMany.mockResolvedValue([
      { userType: 'DOCTOR', documentName: 'License', required: true },
      { userType: 'NURSE', documentName: 'License', required: true },
    ]);
    const result = await service.listForRole();
    expect(result).toEqual({
      DOCTOR: [{ documentName: 'License', required: true }],
      NURSE: [{ documentName: 'License', required: true }],
    });
  });

  it('falls back to uppercase when resolver returns null', async () => {
    signupToCodeAsync.mockResolvedValue(null);
    findMany.mockResolvedValue([]);
    await service.listForRole('some-new-role');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userType: 'SOME-NEW-ROLE' } }),
    );
  });

  it('swallows DB errors and returns safe default', async () => {
    signupToCodeAsync.mockResolvedValue('DOCTOR');
    findMany.mockRejectedValue(new Error('db down'));
    const result = await service.listForRole('doctor');
    expect(result).toEqual([]);
  });
});
