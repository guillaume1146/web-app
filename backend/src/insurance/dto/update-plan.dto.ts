import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class UpdatePlanDto {
  @IsOptional() @IsString() planName?: string;
  @IsOptional() @IsString() planType?: string;
  @IsOptional() @IsNumber() monthlyPremium?: number;
  @IsOptional() @IsNumber() coverageAmount?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() features?: string[];
  @IsOptional() @IsArray() coverageDetails?: string[];
}
