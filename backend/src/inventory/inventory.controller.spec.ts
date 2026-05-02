import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

const mockService = {
  getItems: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deactivateItem: jest.fn(),
  getOrders: jest.fn(),
  createOrder: jest.fn(),
  updateOrderStatus: jest.fn(),
  searchHealthShop: jest.fn(),
};

describe('InventoryController', () => {
  let controller: InventoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [{ provide: InventoryService, useValue: mockService }],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
