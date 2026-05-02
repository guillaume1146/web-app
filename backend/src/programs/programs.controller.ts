import { Controller, Get, Post, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { CreateProgramDto } from './dto/create-program.dto';

@ApiTags('Programs')
@Controller('programs')
export class ProgramsController {
  constructor(private programsService: ProgramsService) {}

  @Public()
  @Get()
  async list(@Query('providerType') providerType?: string, @Query('countryCode') countryCode?: string) {
    const programs = await this.programsService.list(providerType, countryCode);
    return { success: true, data: programs };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateProgramDto, @CurrentUser() user: JwtPayload) {
    const program = await this.programsService.create(body, user.sub);
    return { success: true, data: program };
  }

  @Post(':id/enroll')
  @HttpCode(HttpStatus.OK)
  async enroll(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const result = await this.programsService.enroll(id, user.sub);
    if ('error' in result) return { success: false, message: result.error };
    return { success: true, data: result.data };
  }
}
