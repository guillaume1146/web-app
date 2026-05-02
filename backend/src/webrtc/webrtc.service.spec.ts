import { WebRtcService } from './webrtc.service';

describe('WebRtcService', () => {
  let service: WebRtcService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      videoRoom: { findFirst: jest.fn(), findMany: jest.fn() },
      videoCallSession: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      webRTCConnection: { upsert: jest.fn(), create: jest.fn() },
      serviceBooking: { findFirst: jest.fn(), findUnique: jest.fn() },
      workflowStepLog: { findFirst: jest.fn() },
      workflowInstance: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      patientProfile: { findUnique: jest.fn() },
    };
    service = new WebRtcService(mockPrisma);
  });

  describe('getActiveSession', () => {
    it('returns null when roomCode is empty', async () => {
      expect(await service.getActiveSession('')).toBeNull();
    });
    it('returns null when room not found', async () => {
      mockPrisma.videoRoom.findFirst.mockResolvedValue(null);
      expect(await service.getActiveSession('R1')).toBeNull();
    });
    it('returns null when no active session', async () => {
      mockPrisma.videoRoom.findFirst.mockResolvedValue({ id: 'room-id', roomCode: 'R1' });
      mockPrisma.videoCallSession.findFirst.mockResolvedValue(null);
      expect(await service.getActiveSession('R1')).toBeNull();
    });
    it('returns active session shape', async () => {
      mockPrisma.videoRoom.findFirst.mockResolvedValue({ id: 'room-id', roomCode: 'R1' });
      mockPrisma.videoCallSession.findFirst.mockResolvedValue({
        id: 'sess1', status: 'active', startedAt: new Date('2026-01-01'),
      });
      const res = await service.getActiveSession('R1');
      expect(res).toEqual({
        id: 'sess1',
        roomId: 'R1',
        status: 'active',
        isActive: true,
        startedAt: new Date('2026-01-01'),
      });
    });
  });

  describe('createOrJoinSession', () => {
    it('throws when roomCode missing', async () => {
      await expect(service.createOrJoinSession('', 'u1')).rejects.toThrow('roomId and userId are required');
    });
    it('throws when room does not exist', async () => {
      mockPrisma.videoRoom.findFirst.mockResolvedValue(null);
      await expect(service.createOrJoinSession('R1', 'u1')).rejects.toThrow('Video room not found');
    });
    it('joins existing session and upserts connection', async () => {
      mockPrisma.videoRoom.findFirst.mockResolvedValue({ id: 'room-id' });
      mockPrisma.videoCallSession.findFirst.mockResolvedValue({ id: 'existing', status: 'active' });
      mockPrisma.webRTCConnection.upsert.mockResolvedValue({});
      const res = await service.createOrJoinSession('R1', 'u1', 'Alice');
      expect(res.session.id).toBe('existing');
      expect(mockPrisma.webRTCConnection.upsert).toHaveBeenCalled();
      expect(mockPrisma.videoCallSession.create).not.toHaveBeenCalled();
    });
    it('creates new session when none active', async () => {
      mockPrisma.videoRoom.findFirst.mockResolvedValue({ id: 'room-id' });
      mockPrisma.videoCallSession.findFirst.mockResolvedValue(null);
      mockPrisma.videoCallSession.create.mockResolvedValue({ id: 'new-sess', status: 'active' });
      mockPrisma.webRTCConnection.create.mockResolvedValue({});
      const res = await service.createOrJoinSession('R1', 'u1', 'Bob');
      expect(res.session.id).toBe('new-sess');
      expect(mockPrisma.videoCallSession.create).toHaveBeenCalled();
    });
  });

  describe('recoverSession', () => {
    it('returns canRecover=false when no roomCode', async () => {
      expect(await service.recoverSession('')).toEqual({ canRecover: false, reason: 'roomId is required' });
    });
    it('returns canRecover=false when no session', async () => {
      mockPrisma.videoCallSession.findFirst.mockResolvedValue(null);
      expect(await service.recoverSession('R1')).toEqual({ canRecover: false, reason: 'No session found' });
    });
    it('returns expired when ended >5min ago', async () => {
      mockPrisma.videoCallSession.findFirst.mockResolvedValue({
        id: 's', status: 'ended', endedAt: new Date(Date.now() - 10 * 60 * 1000),
        connections: [],
      });
      expect(await service.recoverSession('R1')).toEqual({ canRecover: false, reason: 'Session expired' });
    });
    it('reactivates and returns participants when recoverable', async () => {
      mockPrisma.videoCallSession.findFirst.mockResolvedValue({
        id: 's1', status: 'active', startedAt: new Date(), endedAt: null,
        connections: [
          { userId: 'u1', userName: 'A', userType: 'DOCTOR', connectionState: 'connected' },
          { userId: 'u2', userName: 'B', userType: 'MEMBER', connectionState: 'ended' },
        ],
      });
      mockPrisma.webRTCConnection.upsert.mockResolvedValue({});
      const res = await service.recoverSession('R1', 'u1');
      expect(res.canRecover).toBe(true);
      expect((res.session as any).participants).toHaveLength(1);
      expect((res.session as any).participants[0].userId).toBe('u1');
    });
  });

  describe('endSession / updateSessionHealth', () => {
    it('endSession throws without id', async () => {
      await expect(service.endSession('')).rejects.toThrow('sessionId is required');
    });
    it('endSession updates status to completed', async () => {
      mockPrisma.videoCallSession.update.mockResolvedValue({});
      await service.endSession('s1');
      expect(mockPrisma.videoCallSession.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ status: 'completed' }),
      }));
    });
    it('updateSessionHealth marks failed when connectionState=failed', async () => {
      mockPrisma.videoCallSession.update.mockResolvedValue({});
      await service.updateSessionHealth('s1', 'failed');
      expect(mockPrisma.videoCallSession.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'failed' },
      }));
    });
  });
});
