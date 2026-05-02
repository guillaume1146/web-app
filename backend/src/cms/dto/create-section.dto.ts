import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  sectionType: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  countryCode?: string;
}
