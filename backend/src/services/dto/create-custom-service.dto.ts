import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCustomServiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  iconKey?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
