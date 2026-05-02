import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { RequiredDocumentsService } from './required-documents.service';

/**
 * Public endpoint so any user can see which documents they must upload
 * (used by the profile "Documents" tab + verification banner).
 *
 * Controller is intentionally thin per .claude/rules/clean-architecture.md —
 * all DB access lives in {@link RequiredDocumentsService}.
 */
@ApiTags('Config')
@Controller('required-documents')
@Public()
export class RequiredDocumentsController {
  constructor(private readonly service: RequiredDocumentsService) {}

  @Get()
  async list(@Query('userType') userType?: string) {
    const data = await this.service.listForRole(userType);
    return { success: true, data };
  }
}
