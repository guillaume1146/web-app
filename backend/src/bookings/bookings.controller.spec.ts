import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

/**
 * Regression tests for the legacy-alias DTO handling in the booking controller.
 *
 * The audit found 10+ frontend files still sending role-specific ID fields
 * (doctorId / nurseId / nannyId / labTechId / emergencyWorkerId) plus the
 * older `price` / `scheduledAt` aliases. The controller must fold those into
 * the canonical fields before delegating to the service.
 */
describe('BookingsController — legacy field aliases', () => {
  let controller: BookingsController;
  let service: { createBooking: jest.Mock };

  beforeEach(async () => {
    service = { createBooking: jest.fn().mockResolvedValue({ booking: { id: 'BKNEW1' } }) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [{ provide: BookingsService, useValue: service }],
    }).compile();
    controller = module.get<BookingsController>(BookingsController);
  });

  const base: Partial<CreateBookingDto> = {
    providerType: 'DOCTOR',
    scheduledDate: '2026-05-01',
    scheduledTime: '10:00',
  };

  it('accepts canonical providerUserId', async () => {
    const res = await controller.create({ ...base, providerUserId: 'USR001' } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(res.success).toBe(true);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({ providerUserId: 'USR001' }));
  });

  it('folds doctorId → providerUserId', async () => {
    await controller.create({ ...base, doctorId: 'DOC001' } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({ providerUserId: 'DOC001' }));
  });

  it('folds nurseId → providerUserId', async () => {
    await controller.create({ ...base, nurseId: 'NUR001' } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({ providerUserId: 'NUR001' }));
  });

  it('folds nannyId → providerUserId', async () => {
    await controller.create({ ...base, nannyId: 'NAN001' } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({ providerUserId: 'NAN001' }));
  });

  it('folds labTechId → providerUserId', async () => {
    await controller.create({ ...base, labTechId: 'LAB001' } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({ providerUserId: 'LAB001' }));
  });

  it('folds emergencyWorkerId → providerUserId', async () => {
    await controller.create({ ...base, emergencyWorkerId: 'EMW001' } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({ providerUserId: 'EMW001' }));
  });

  it('folds price → servicePrice when servicePrice is missing', async () => {
    await controller.create({ ...base, doctorId: 'DOC001', price: 1500 } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({ servicePrice: 1500 }));
  });

  it('prefers canonical servicePrice when both are sent', async () => {
    await controller.create({ ...base, doctorId: 'DOC001', price: 100, servicePrice: 200 } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({ servicePrice: 200 }));
  });

  it('folds scheduledAt (ISO) into scheduledDate + scheduledTime when those are missing', async () => {
    await controller.create({
      providerType: 'EMERGENCY_WORKER',
      emergencyWorkerId: 'EMW001',
      scheduledAt: '2026-05-01T14:30:00.000Z',
    } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(service.createBooking).toHaveBeenCalledWith('PAT001', expect.objectContaining({
      scheduledDate: '2026-05-01',
      scheduledTime: '14:30',
    }));
  });

  it('rejects when no id field is supplied', async () => {
    const res = await controller.create({ ...base } as CreateBookingDto, { sub: 'PAT001' } as any);
    expect(res.success).toBe(false);
    expect(service.createBooking).not.toHaveBeenCalled();
  });
});
