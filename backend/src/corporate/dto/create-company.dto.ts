import { IsString, IsOptional, IsInt, IsBoolean, IsNumber, Min } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  employeeCount?: number;

  // Subscription plan the company enrols members in.
  @IsOptional()
  @IsString()
  subscriptionPlanId?: string;

  // Insurance-company flag — true when the company collects monthly
  // contributions from members.
  @IsOptional()
  @IsBoolean()
  isInsuranceCompany?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyContribution?: number;

  @IsOptional()
  @IsString()
  coverageDescription?: string;
}
