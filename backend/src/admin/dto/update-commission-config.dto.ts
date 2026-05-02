import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCommissionConfigDto {
  @IsOptional()
  @IsNumber()
  platformCommissionRate?: number;

  // Accept both `providerRate` (canonical) and `providerCommissionRate` (legacy).
  @IsOptional()
  @IsNumber()
  providerRate?: number;

  @IsOptional()
  @IsNumber()
  providerCommissionRate?: number;

  @IsOptional()
  @IsNumber()
  regionalCommissionRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  trialWalletAmount?: number;
}
