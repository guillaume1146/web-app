import { IsOptional, IsNumber } from 'class-validator';

export class CreateVitalSignsDto {
  @IsOptional()
  @IsNumber()
  systolicBP?: number;

  @IsOptional()
  @IsNumber()
  diastolicBP?: number;

  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  oxygenSaturation?: number;

  @IsOptional()
  @IsNumber()
  glucose?: number;

  @IsOptional()
  @IsNumber()
  cholesterol?: number;
}
