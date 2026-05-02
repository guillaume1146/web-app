import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateClaimDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  approvedAmount?: number;
}
