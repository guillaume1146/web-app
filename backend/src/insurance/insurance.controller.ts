import { Controller, Get, Post, Put, Patch, Delete, Query, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { InsuranceService } from './insurance.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Insurance')
@Controller('insurance')
export class InsuranceController {
  constructor(private insuranceService: InsuranceService) {}

  @Get('claims')
  async getClaims(@CurrentUser() user: JwtPayload, @Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.insuranceService.getClaims(user.sub, Math.max(parseInt(page || '1'), 1), parseInt(limit || '20'));
    return { success: true, ...result };
  }

  @Post('claims')
  async createClaim(@Body() body: CreateClaimDto, @CurrentUser() user: JwtPayload) {
    const claim = await this.insuranceService.createClaim(user.sub, body);
    return { success: true, data: claim };
  }

  @Public()
  @Get('plans')
  async getPlans(@Query('q') q?: string) {
    const plans = await this.insuranceService.getPlans(q);
    return { success: true, data: plans };
  }

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: JwtPayload) {
    const data = await this.insuranceService.getDashboard(user.sub);
    return { success: true, data };
  }

  @Get(':userId/dashboard')
  async getDashboardByUserId(@Param('userId') userId: string) {
    const data = await this.insuranceService.getDashboard(userId);
    return { success: true, data };
  }

  @Patch('claims/:id')
  async updateClaim(@Param('id') id: string, @Body() body: UpdateClaimDto) {
    const updated = await this.insuranceService.updateClaim(id, body);
    return { success: true, data: updated };
  }

  @Delete('claims/:id')
  async deleteClaim(@Param('id') id: string) {
    await this.insuranceService.deleteClaim(id);
    return { success: true, message: 'Claim cancelled' };
  }

  @Post('plans')
  async createPlan(@Body() body: CreatePlanDto, @CurrentUser() user: JwtPayload) {
    const plan = await this.insuranceService.createPlan(user.sub, body);
    return { success: true, data: plan };
  }

  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    const updated = await this.insuranceService.updatePlan(id, body);
    return { success: true, data: updated };
  }

  @Put('plans/:id')
  async updatePlanPut(@Param('id') id: string, @Body() body: CreatePlanDto) {
    return this.updatePlan(id, body);
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id') id: string) {
    await this.insuranceService.deletePlan(id);
    return { success: true, message: 'Plan deactivated' };
  }

  @Get(':repId/plans')
  async getPlansByRep(@Param('repId') repId: string) {
    const plans = await this.insuranceService.getPlansByRep(repId);
    return { success: true, data: plans };
  }

  // ─── Client Management ──────────────────────────────────────────────────────

  @Post(':repId/clients')
  async addClient(
    @Param('repId') repId: string,
    @Body() body: { email: string; planId?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const client = await this.insuranceService.addClient(repId, body.email, body.planId);
    return { success: true, data: client };
  }

  @Get(':repId/clients')
  async getClients(@Param('repId') repId: string, @CurrentUser() user: JwtPayload) {
    const clients = await this.insuranceService.getClients(repId);
    return { success: true, data: clients };
  }
}
