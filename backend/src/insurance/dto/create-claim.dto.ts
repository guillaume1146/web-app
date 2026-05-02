import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateClaimDto {
  @IsOptional()
  @IsString()
  policyHolderName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  policyType?: string;

  @IsOptional()
  @IsNumber()
  claimAmount?: number;

  @IsOptional()
  @IsString()
  planId?: string;
}
