import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

const mockService = {
  getProfile: jest.fn(),
  getServices: jest.fn(),
  getReviews: jest.fn(),
  createReview: jest.fn(),
  getBookingRequests: jest.fn(),
};

describe('ProvidersController', () => {
  let controller: ProvidersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [{ provide: ProvidersService, useValue: mockService }],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
