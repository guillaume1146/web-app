import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsString()
  title: string;

  @IsDateString()
  date: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
