import { IsString, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';

export class CreateBookingDto {
  // Canonical field. Legacy aliases (doctorId, nurseId, nannyId, labTechId)
  // are accepted and folded into providerUserId by the controller.
  @IsOptional()
  @IsString()
  providerUserId?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  nurseId?: string;

  @IsOptional()
  @IsString()
  nannyId?: string;

  @IsOptional()
  @IsString()
  labTechId?: string;

  @IsOptional()
  @IsString()
  emergencyWorkerId?: string;

  @IsString()
  providerType: string;

  @IsString()
  scheduledDate: string;

  @IsString()
  scheduledTime: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsNumber()
  servicePrice?: number;

  // Legacy alias for servicePrice — folded in controller.
  @IsOptional()
  @IsNumber()
  price?: number;

  // Legacy fields still in use by some pages (emergency, lab).
  @IsOptional()
  @IsString()
  emergencyType?: string;

  @IsOptional()
  @IsString()
  responseWindow?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  consultationType?: string;

  @IsOptional()
  @IsArray()
  children?: any[];

  @IsOptional()
  @IsString()
  sampleType?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  testName?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  specialty?: string;
}
