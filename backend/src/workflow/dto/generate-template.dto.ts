import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  IsPositive,
  IsBoolean,
  Min,
} from 'class-validator';

export type OutputType =
  | 'none'
  | 'exam_report'
  | 'lab_result'
  | 'prescription'
  | 'eye_prescription'
  | 'care_notes'
  | 'exercise_plan'
  | 'meal_plan';

export class GenerateTemplateDto {
  // ─── Required axes ────────────────────────────────────────────────────────

  @IsString()
  @IsIn(['home', 'office', 'video', 'audio', 'async'])
  location: 'home' | 'office' | 'video' | 'audio' | 'async';

  @IsString()
  @IsIn(['none', 'home', 'office', 'self_kit'])
  sample: 'none' | 'home' | 'office' | 'self_kit';

  @IsString()
  @IsIn(['single', 'delegated', 'group', 'multi'])
  careModel: 'single' | 'delegated' | 'group' | 'multi';

  @IsString()
  @IsIn(['scheduled', 'urgent', 'emergency'])
  urgency: 'scheduled' | 'urgent' | 'emergency';

  // ─── Recurrence ───────────────────────────────────────────────────────────

  @IsString()
  @IsIn(['once', 'recurring'])
  recurrenceType: 'once' | 'recurring';

  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'biweekly', 'monthly'])
  recurrenceFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';

  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceInterval?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sessionCount?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  slotDuration?: number;

  // ─── Clinical output type ─────────────────────────────────────────────────
  // What document / result does this service produce at the end?
  // Drives the output step type and its content requirement flag.

  @IsOptional()
  @IsString()
  @IsIn(['none', 'exam_report', 'lab_result', 'prescription', 'eye_prescription', 'care_notes', 'exercise_plan', 'meal_plan'])
  outputType?: OutputType;

  // ─── Access & payment settings ────────────────────────────────────────────

  /** Patient must have an active prescription in DB to book this service. */
  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  /**
   * Health Shop / product order — enables stock check on acceptance and
   * stock subtract on completion via serviceConfig.stock.
   */
  @IsOptional()
  @IsBoolean()
  isHealthShop?: boolean;

  /**
   * Override auto-derived payment timing.
   * When omitted: office/async → ON_COMPLETION, everything else → ON_ACCEPTANCE.
   */
  @IsOptional()
  @IsString()
  @IsIn(['ON_ACCEPTANCE', 'ON_COMPLETION'])
  paymentTimingOverride?: 'ON_ACCEPTANCE' | 'ON_COMPLETION';

  // ─── Optional context ─────────────────────────────────────────────────────

  @IsOptional()
  @IsString()
  providerType?: string;

  @IsOptional()
  @IsString()
  platformServiceId?: string;

  @IsOptional()
  @IsString()
  regionCode?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
