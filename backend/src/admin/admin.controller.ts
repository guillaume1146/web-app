import { Controller, Get, Post, Put, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { AdminService } from './admin.service';
import { AdminAuditService } from '../shared/services/admin-audit.service';
import { LedgerReconciliationService } from '../shared/services/ledger-reconciliation.service';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { UpdateRoleConfigDto } from './dto/update-role-config.dto';
import { UpdateCommissionConfigDto } from './dto/update-commission-config.dto';
import { UpdateRequiredDocumentsDto } from './dto/update-required-documents.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private adminAudit: AdminAuditService,
    private ledgerReconciliation: LedgerReconciliationService,
  ) {}

  @Get('stats')
  async stats() {
    const data = await this.adminService.getStats();
    return { success: true, data };
  }

  /** GET /api/admin/reconcile-ledger — run reconciliation on-demand. */
  @Get('reconcile-ledger')
  async reconcileLedger() {
    const data = await this.ledgerReconciliation.reconcile();
    return { success: true, data };
  }

  @Get('dashboard')
  async dashboard() {
    try {
      const data = await this.adminService.getDashboard();
      return { success: true, data };
    } catch { return { success: true, data: { stats: { totalUsers: 0, pendingValidations: 0, monthlyRevenue: 0, activeSessions: 0 }, categoryStats: [], recentActivity: [] } }; }
  }

  @Get('required-documents')
  async getRequiredDocs() {
    try {
      const { grouped, raw } = await this.adminService.getRequiredDocuments();
      return { success: true, data: grouped, raw };
    } catch { return { success: true, data: {}, raw: [] }; }
  }

  @Put('required-documents')
  async updateRequiredDocs(@Body() dto: UpdateRequiredDocumentsDto) {
    try {
      const results = await this.adminService.updateRequiredDocuments(dto.configs);
      return { success: true, data: results };
    } catch { return { success: false, message: 'Failed to update' }; }
  }

  // ── Audit log ─────────────────────────────────────────────────────────────

  @Get('audit-log')
  async listAuditLog(
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('adminId') adminId?: string,
  ) {
    const data = await this.adminAudit.list({
      limit: parseInt(limit || '100', 10),
      action,
      targetType,
      adminId,
    });
    return { success: true, data };
  }

  // ── Document verification queue ───────────────────────────────────────────

  @Get('documents/pending')
  async listPendingDocuments(@Query('limit') limit?: string) {
    const data = await this.adminService.listPendingDocuments(
      Math.min(100, parseInt(limit || '50', 10) || 50),
    );
    return { success: true, data };
  }

  @Patch('documents/:id/approve')
  async approveDocument(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.adminService.reviewDocument(id, 'approved', user.sub);
    return { success: true, data };
  }

  @Patch('documents/:id/reject')
  async rejectDocument(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.adminService.reviewDocument(id, 'rejected', user.sub, body?.reason);
    return { success: true, data };
  }

  // ── GET /admin/accounts — list all users with status filter ────────────────
  @Get('accounts')
  async listAccounts(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));

      const result = await this.adminService.listAccounts({ status, page: pageNum, limit: limitNum });
      return { success: true, data: result.users, total: result.total, page: result.page, totalPages: result.totalPages };
    } catch (error) {
      console.error('GET /admin/accounts error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /admin/accounts — alias for PATCH (some pages use POST) ──────────
  @Post('accounts')
  async postAccountAction(@Body() dto: UpdateAccountStatusDto, @CurrentUser() admin: JwtPayload) {
    return this.updateAccountStatus(dto, admin);
  }

  // ── PATCH /admin/accounts — approve/suspend user ──────────────────────────
  @Patch('accounts')
  async updateAccountStatus(@Body() dto: UpdateAccountStatusDto, @CurrentUser() admin: JwtPayload) {
    try {
      const user = await this.adminService.updateAccountStatus(dto.userId, dto.action, admin.sub);
      return { success: true, data: user };
    } catch (error) {
      console.error('PATCH /admin/accounts error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/admins — list regional admins ──────────────────────────────
  @Get('admins')
  async listAdmins() {
    try {
      const admins = await this.adminService.listAdmins();
      return { success: true, data: admins };
    } catch (error) {
      console.error('GET /admin/admins error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/alerts — recent alerts ─────────────────────────────────────
  @Get('alerts')
  async getAlerts() {
    try {
      const alerts = await this.adminService.getAlerts();
      return { success: true, data: alerts };
    } catch (error) {
      console.error('GET /admin/alerts error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/commission-config — commission configuration ───────────────
  @Get('commission-config')
  async getCommissionConfig() {
    try {
      const data = await this.adminService.getCommissionConfig();
      return { success: true, data };
    } catch (error) {
      console.error('GET /admin/commission-config error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── PUT /admin/commission-config — update commission (super admin only) ───
  @Put('commission-config')
  async updateCommissionConfig(@Body() dto: UpdateCommissionConfigDto) {
    try {
      const platformRate = dto.platformCommissionRate ?? 15;
      const providerRate = dto.providerRate ?? dto.providerCommissionRate ?? 85;
      const config = await this.adminService.updateCommissionConfig(platformRate, providerRate, (dto as any).currency, (dto as any).trialWalletAmount);
      return { success: true, data: config };
    } catch (error) {
      console.error('PUT /admin/commission-config error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/metrics — aggregate stats ──────────────────────────────────
  @Get('metrics')
  async getMetrics() {
    try {
      const data = await this.adminService.getMetrics();
      return { success: true, data };
    } catch (error) {
      console.error('GET /admin/metrics error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/platform-commission — commission revenue data ──────────────
  @Get('platform-commission')
  async getPlatformCommission() {
    try {
      const data = await this.adminService.getPlatformCommission();
      return { success: true, data };
    } catch (error) {
      console.error('GET /admin/platform-commission error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/regional-activity — activity per region ────────────────────
  @Get('regional-activity')
  async getRegionalActivity() {
    try {
      const data = await this.adminService.getRegionalActivity();
      return { success: true, data };
    } catch (error) {
      console.error('GET /admin/regional-activity error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/security — security overview ───────────────────────────────
  @Get('security')
  async getSecurityOverview() {
    try {
      const data = await this.adminService.getSecurityOverview();
      return { success: true, data };
    } catch (error) {
      console.error('GET /admin/security error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/system-health — system health check ────────────────────────
  @Get('system-health')
  async getSystemHealth() {
    try {
      const data = await this.adminService.getSystemHealth();
      return { success: true, data };
    } catch (error) {
      console.error('GET /admin/system-health error:', error);
      return {
        success: true,
        data: {
          services: [{ name: 'database', status: 'unhealthy', latency: -1, responseTime: -1 }],
          overallHealth: 'unhealthy',
          totalUsers: 0,
          activeUsers: 0,
          performance: { cpuUsage: 0, memoryUsage: 0, memoryUsedMb: 0 },
        },
      };
    }
  }

  // ── GET /admin/regions — list all regions ─────────────────────────────────
  @Get('regions')
  async getRegions() {
    try {
      const regions = await this.adminService.getRegions();
      return { success: true, data: regions };
    } catch (error) {
      console.error('GET /admin/regions error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── GET /admin/role-config — get all role configurations ──────────────────
  @Get('role-config')
  async getRoleConfig() {
    try {
      const configs = await this.adminService.getRoleConfig();
      return { success: true, data: configs };
    } catch { return { success: true, data: [] }; }
  }

  // ── PATCH /admin/role-config — update role configuration ──────────────────
  @Patch('role-config')
  async updateRoleConfig(@Body() dto: UpdateRoleConfigDto) {
    try {
      const config = await this.adminService.updateRoleConfig(dto.id, dto);
      return { success: true, data: config };
    } catch { return { success: false, message: 'Failed to update role config' }; }
  }
}
