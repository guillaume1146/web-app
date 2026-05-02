import { Test, TestingModule } from '@nestjs/testing';
import { HealthDataController } from './health-data.controller';
import { HealthDataService } from './health-data.service';

const mockService = {
  getMedicalRecords: jest.fn(),
  createMedicalRecord: jest.fn(),
  getPrescriptions: jest.fn(),
  createPrescription: jest.fn(),
  getVitalSigns: jest.fn(),
  createVitalSigns: jest.fn(),
  getPillReminders: jest.fn(),
  getLabTests: jest.fn(),
  getClaims: jest.fn(),
};

describe('HealthDataController', () => {
  let controller: HealthDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthDataController],
      providers: [{ provide: HealthDataService, useValue: mockService }],
    }).compile();

    controller = module.get<HealthDataController>(HealthDataController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
