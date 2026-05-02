import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  providerType?: string;

  @IsString()
  serviceMode: string;

  @IsOptional()
  @IsString()
  platformServiceId?: string;

  @IsOptional()
  @IsString()
  regionCode?: string;

  @IsArray()
  steps: any[];

  @IsArray()
  transitions: any[];

  // ─── Service-level systematic configuration ──────────────────────────────
  // Free-form JSON; see WorkflowServiceConfig in types.ts for the recognised shape.
  // Designed for zero-schema-change extensibility.
  @IsOptional()
  serviceConfig?: Record<string, unknown>;
}
