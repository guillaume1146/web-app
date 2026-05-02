import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateServiceConfigDto {
  @IsString()
  configId: string;

  @IsOptional()
  @IsNumber()
  priceOverride?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
