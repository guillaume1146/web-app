import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class EnvironmentVariables {
  @IsString() JWT_SECRET: string;
  @IsString() DATABASE_URL: string;
  @IsOptional() @IsNumber() API_PORT: number = 3001;
  @IsOptional() @IsString() NODE_ENV: string = 'development';
  @IsOptional() @IsString() GROQ_API_KEY: string;
  @IsOptional() @IsString() SUPER_ADMIN_EMAIL: string;
  @IsOptional() @IsString() SUPER_ADMIN_PASSWORD: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors.map(e => `  - ${e.property}: ${Object.values(e.constraints || {}).join(', ')}`).join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }
  return validated;
}
