import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreatePlatformServiceDto {
  @IsString()
  providerType: string;

  @IsString()
  serviceName: string;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  iconKey?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  requiredContentType?: string;
}
