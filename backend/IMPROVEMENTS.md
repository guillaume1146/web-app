# NestJS Backend — Improvement Plan

## Architecture Assessment (Apr 2026)

The backend has 38+ modules with solid structure. Key improvements needed for enterprise-grade clean code.

---

## Priority 1: CRITICAL — Type Safety

### 1.1 Create DTOs for all endpoints (33 untyped)

**Problem**: 33 controller methods use `@Body() body: any` — no compile-time or runtime validation.

**Fix**: Create DTO classes with `class-validator` decorators in `<module>/dto/` directories.

**Affected modules**: bookings, health-data, cms, insurance, inventory, workflow, regional, admin, services, documents, programs, users

**Example**:
```typescript
// backend/src/bookings/dto/create-booking.dto.ts
import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsString() providerUserId: string;
  @IsString() providerType: string;
  @IsDateString() scheduledDate: string;
  @IsString() scheduledTime: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsNumber() duration?: number;
  @IsOptional() @IsString() serviceName?: string;
  @IsOptional() @IsNumber() servicePrice?: number;
}
```

### 1.2 Replace Zod schemas in auth.controller.ts with class-validator DTOs

The auth controller uses inline Zod schemas (lines 12-66). Migrate to class-validator DTOs for consistency with the rest of NestJS.

---

## Priority 2: HIGH — Service Layer Cleanup

### 2.1 Extract PrismaService from 9 controllers

These controllers still inject PrismaService directly:
- `ai/health-tracker.controller.ts` (652 lines!) — needs HealthTrackerService
- `health/health.controller.ts` — needs HealthCheckService
- `health-data/patients-alias.controller.ts` — needs to delegate to HealthDataService
- `webrtc/webrtc.controller.ts` — needs WebRtcService
- `search/search.controller.ts` — partially uses SearchService, some direct calls remain
- `services/services.controller.ts` — needs to fully use ServicesService
- `users/users.controller.ts` — partially uses UsersService
- `workflow/workflow.controller.ts` — needs to fully use WorkflowService
- `legacy-routes/legacy-routes.controller.ts` — uses PrismaService for some queries

### 2.2 Remove silent error catching in controllers

**Problem**: Many controllers catch errors silently:
```typescript
try {
  const data = await this.service.getData();
  return { success: true, data };
} catch { return { success: true, data: [] }; }  // SWALLOWS ERRORS!
```

**Fix**: Remove try-catch blocks. Let GlobalExceptionFilter handle errors. Only catch when you need custom error responses.

---

## Priority 3: HIGH — Swagger Documentation

### 3.1 Add @ApiTags to all controllers

```typescript
@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController { ... }
```

### 3.2 Add @ApiOperation + @ApiResponse to all endpoints

```typescript
@ApiOperation({ summary: 'Create a new booking' })
@ApiResponse({ status: 201, description: 'Booking created with workflow attached' })
@ApiResponse({ status: 400, description: 'Insufficient wallet balance' })
@Post()
async create(@Body() dto: CreateBookingDto) { ... }
```

---

## Priority 4: MEDIUM — Configuration

### 4.1 Use @nestjs/config with validation

Replace scattered `process.env` (428 instances) with ConfigService:

```typescript
// backend/src/config/env.validation.ts
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class EnvironmentVariables {
  @IsString() JWT_SECRET: string;
  @IsNumber() @IsOptional() API_PORT: number = 3001;
  @IsString() @IsOptional() NODE_ENV: string = 'development';
  @IsString() @IsOptional() GROQ_API_KEY: string;
}
```

### 4.2 Add @nestjs/terminus health checks

```typescript
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

---

## Priority 5: MEDIUM — Code Organization

### 5.1 Break large files

| File | Lines | Split Into |
|------|-------|-----------|
| `ai/health-tracker.controller.ts` | 652 | HealthTrackerService + controller |
| `ai/ai.service.ts` | 613 | AiChatService + AiContextService |
| `auth/auth.service.ts` | 510 | AuthService + ProfileCreationService |
| `admin/admin.service.ts` | 334 | AdminStatsService + AdminAccountsService |

### 5.2 Extract shared utilities

```
backend/src/shared/
  helpers/
    pagination.helper.ts    — shared pagination logic
    date.helper.ts          — date formatting/parsing
  decorators/
    api-paginated.decorator.ts — @ApiPaginatedResponse()
  pipes/
    parse-page.pipe.ts     — @Query('page', ParsePagePipe) page: number
```

### 5.3 Add barrel exports

Every module directory should have `index.ts`:
```typescript
// backend/src/bookings/index.ts
export * from './bookings.service';
export * from './bookings.controller';
export * from './bookings.module';
```

---

## Priority 6: LOW — Logging & Observability

### 6.1 Use NestJS Logger instead of console.log

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  async createBooking(...) {
    this.logger.log(`Creating booking for patient ${patientId}`);
    // ...
    this.logger.warn(`Insufficient balance: ${balance} < ${fee}`);
  }
}
```

### 6.2 Add request correlation IDs

Trace requests across services with a unique ID per request.

---

## Estimated Effort

| Priority | Items | Effort |
|----------|-------|--------|
| P1 DTOs | 33 endpoints | 2-3 days |
| P2 Service extraction | 9 controllers | 1-2 days |
| P3 Swagger decorators | All controllers | 1 day |
| P4 Config + Health | Global | 1 day |
| P5 Code organization | Large files | 1-2 days |
| P6 Logging | All services | 1 day |
| **Total** | | **7-10 days** |
