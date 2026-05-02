import { Controller, Get, Post, Patch, Put, Delete, Param, Query, Body, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import { InvoiceService } from '../shared/services/invoice.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
  ) {}

  private assertSelf(user: JwtPayload, id: string) {
    if (user.sub !== id) throw new ForbiddenException('You can only access your own data');
  }

  // ─── Search (must be declared BEFORE :id routes) ──────────────────────────

  @Get('search')
  async searchUsers(@Query('q') q: string, @CurrentUser() user: JwtPayload) {
    try {
      if (!q || q.length < 2) return { success: true, data: [] };
      const users = await this.prisma.user.findMany({
        where: {
          id: { not: user.sub },
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, email: true, profileImage: true, userType: true },
        take: 20,
        orderBy: { firstName: 'asc' },
      });
      return { success: true, data: users };
    } catch { return { success: true, data: [] }; }
  }

  // ─── User profile (:id) ───────────────────────────────────────────────────

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return { success: true, data: await this.usersService.findById(id) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.update(id, body) };
  }

  // ─── Notifications ─────────────────────────────────────────────────────

  @Get(':id/notifications')
  async getNotifications(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Query('unread') unread?: string, @Query('limit') limit?: string) {
    this.assertSelf(user, id);
    const result = await this.usersService.getNotifications(id, { unread: unread === 'true', limit: limit ? parseInt(limit) : undefined });
    return { success: true, data: result.notifications, meta: result.meta };
  }

  @Patch(':id/notifications')
  async markRead(
    @Param('id') id: string,
    @Body() body: { notificationIds?: string[]; notificationId?: string; markAllRead?: boolean; read?: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    this.assertSelf(user, id);
    let ids = body?.notificationIds;
    if ((!ids || ids.length === 0) && body?.notificationId) {
      ids = [body.notificationId];
    }
    if (body?.markAllRead) {
      await this.usersService.markAllNotificationsRead(id);
      return { success: true, message: 'All notifications marked as read' };
    }
    if (!ids || ids.length === 0) {
      return { success: false, message: 'No notificationIds provided' };
    }
    await this.usersService.markNotificationsRead(id, ids);
    return { success: true, message: 'Notifications marked as read' };
  }

  // ─── Wallet ────────────────────────────────────────────────────────────

  @Get(':id/wallet')
  async getWallet(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.getWallet(id) };
  }

  @Post(':id/wallet/topup')
  async topUp(
    @Param('id') id: string,
    @Body() body: { amount: number; channel?: 'mcb_juice' | 'card' | 'mock'; channelRef?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    this.assertSelf(user, id);
    return {
      success: true,
      data: await this.usersService.topUpWallet(id, body.amount, body.channel ?? 'mock', body.channelRef),
    };
  }

  /** Webhook receiver — gateway calls this when an async top-up completes. */
  @Post('wallet/topup/confirm')
  async confirmTopUp(@Body() body: { externalId: string }) {
    return { success: true, data: await this.usersService.confirmPendingTopUp(body.externalId) };
  }

  @Post(':id/wallet/reset')
  async resetWallet(@Param('id') id: string, @Body() body: { amount?: number }, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.resetWallet(id, body.amount) };
  }

  @Post(':id/wallet/debit')
  async debitWallet(@Param('id') id: string, @Body() body: { amount: number; description?: string; serviceType?: string; providerUserId?: string }, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.debitWallet(id, body.amount, body.description, body.serviceType, body.providerUserId) };
  }

  // ─── Subscription ─────────────────────────────────────────────────────

  @Get(':id/subscription')
  async getSubscription(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.getSubscription(id) };
  }

  @Post(':id/subscription')
  async updateSubscription(@Param('id') id: string, @Body() body: { action: string; planId?: string }, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.updateSubscription(id, body.action, body.planId) };
  }

  // ─── Documents ─────────────────────────────────────────────────────────

  @Get(':id/documents')
  async getDocuments(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Query('type') type?: string) {
    return { success: true, data: await this.usersService.getDocuments(id, type) };
  }

  @Post(':id/documents')
  async addDocument(@Param('id') id: string, @Body() body: { name: string; type: string; url: string; size?: number }, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.createDocument(id, body) };
  }

  @Delete(':id/documents/:docId')
  async deleteDocument(@Param('id') id: string, @Param('docId') docId: string, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    await this.usersService.deleteDocument(id, docId);
    return { success: true, message: 'Document deleted' };
  }

  // ─── Availability ─────────────────────────────────────────────────────

  @Get(':id/availability')
  async getAvailability(@Param('id') id: string, @Query('dayOfWeek') dayOfWeek?: string) {
    return { success: true, data: await this.usersService.getAvailability(id, dayOfWeek !== undefined ? parseInt(dayOfWeek) : undefined) };
  }

  @Put(':id/availability')
  async setAvailability(@Param('id') id: string, @Body() body: { slots: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean }> }, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.setAvailability(id, body.slots) };
  }

  // ─── Preferences ───────────────────────────────────────────────────────

  @Get(':id/preferences')
  async getPreferences(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.getPreferences(id) };
  }

  @Put(':id/preferences')
  async updatePreferences(@Param('id') id: string, @Body() body: Record<string, any>, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.updatePreferences(id, body) };
  }

  // ─── Password ──────────────────────────────────────────────────────────

  @Patch(':id/password')
  async changePassword(@Param('id') id: string, @Body() body: UpdatePasswordDto, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    await this.usersService.changePassword(id, body.currentPassword, body.newPassword);
    return { success: true, message: 'Password changed successfully' };
  }

  // ─── Invoices ──────────────────────────────────────────────────────────

  @Get(':id/invoices')
  async getInvoices(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.invoiceService.getInvoices(id) };
  }

  // ─── Billing ───────────────────────────────────────────────────────────

  @Get(':id/billing')
  async getBilling(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.getBilling(id) };
  }

  @Post(':id/billing')
  async addBilling(@Param('id') id: string, @Body() body: { type: string; lastFour: string; cardHolder?: string; expiryDate?: string; isDefault?: boolean }, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    return { success: true, data: await this.usersService.addBilling(id, body) };
  }

  @Delete(':id/billing')
  async deleteBilling(@Param('id') id: string, @Body() body: { billingId: string }, @CurrentUser() user: JwtPayload) {
    this.assertSelf(user, id);
    await this.usersService.deleteBilling(id, body.billingId);
    return { success: true, message: 'Billing info removed' };
  }
}
