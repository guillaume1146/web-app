import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class UpdateRoleConfigDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  singularLabel?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  searchEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  bookingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inventoryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  urlPrefix?: string;

  @IsOptional()
  @IsNumber()
  defaultBookingFee?: number;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
