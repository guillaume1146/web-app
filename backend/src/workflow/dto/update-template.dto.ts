import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  platformServiceId?: string;

  @IsOptional()
  @IsArray()
  steps?: any[];

  @IsOptional()
  @IsArray()
  transitions?: any[];

  @IsOptional()
  serviceConfig?: Record<string, unknown>;
}
