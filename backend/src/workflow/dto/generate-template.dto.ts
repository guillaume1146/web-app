import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  IsPositive,
  Min,
} from 'class-validator';

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
