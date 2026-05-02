import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * Regression: the medicine order frontend sends `medicineId`, but the service
 * expects `pharmacyMedicineId`. The controller now accepts both and normalizes.
 * Also the frontend reads `data.orderId` — we expose that alongside `data.id`.
 */
describe('OrdersController — legacy item field', () => {
  let controller: OrdersController;
  let service: { createOrder: jest.Mock; list: jest.Mock };

  beforeEach(async () => {
    service = {
      createOrder: jest.fn().mockResolvedValue({ id: 'ORD001', status: 'pending', totalAmount: 100 }),
      list: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    }).compile();
    controller = module.get<OrdersController>(OrdersController);
  });

  it('accepts canonical pharmacyMedicineId', async () => {
    await controller.create(
      { items: [{ pharmacyMedicineId: 'PM001', quantity: 2 }] },
      { sub: 'PAT001' } as any,
    );
    expect(service.createOrder).toHaveBeenCalledWith('PAT001', [
      { pharmacyMedicineId: 'PM001', quantity: 2 },
    ]);
  });

  it('folds legacy medicineId → pharmacyMedicineId', async () => {
    await controller.create(
      { items: [{ medicineId: 'M001', quantity: 1 }] },
      { sub: 'PAT001' } as any,
    );
    expect(service.createOrder).toHaveBeenCalledWith('PAT001', [
      { pharmacyMedicineId: 'M001', quantity: 1 },
    ]);
  });

  it('exposes orderId alongside id in response', async () => {
    const res = await controller.create(
      { items: [{ pharmacyMedicineId: 'PM001', quantity: 1 }] },
      { sub: 'PAT001' } as any,
    );
    expect(res.success).toBe(true);
    expect((res.data as any).id).toBe('ORD001');
    expect((res.data as any).orderId).toBe('ORD001');
  });
});
