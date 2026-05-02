import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  providerType?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsNumber()
  maxParticipants?: number;

  @IsOptional()
  @IsNumber()
  durationWeeks?: number;

  @IsOptional()
  @IsNumber()
  price?: number;
}
