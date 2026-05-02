import { Controller, Get, Post, Patch, Delete, Param, Query, Body, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Connections')
@Controller('connections')
export class ConnectionsController {
  constructor(private connectionsService: ConnectionsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    const connections = await this.connectionsService.list(user.sub, status);
    return { success: true, data: connections };
  }

  @Get('suggestions')
  async suggestions(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string, @Query('userId') userId?: string) {
    const uid = userId || user.sub;
    const take = Math.min(parseInt(limit || '10'), 20);
    const suggestions = await this.connectionsService.suggestions(uid, take);
    return { success: true, data: suggestions };
  }

  @Post()
  async create(@Body() body: { toUserId: string }, @CurrentUser() user: JwtPayload) {
    if (body.toUserId === user.sub) throw new BadRequestException('Cannot connect to yourself');
    const connection = await this.connectionsService.create(user.sub, body.toUserId);
    return { success: true, data: connection };
  }

  /** PATCH /api/connections/:id — accept / reject / update status */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { action?: string; status?: string }, @CurrentUser() user: JwtPayload) {
    const connection = await this.connectionsService.findById(id);
    if (!connection) throw new NotFoundException('Connection not found');

    // Only the receiver can accept/reject; either party can block
    if (connection.receiverId !== user.sub && connection.senderId !== user.sub) {
      throw new ForbiddenException('Not authorized for this connection');
    }

    const action = body.action || body.status;
    const statusMap: Record<string, string> = {
      accept: 'accepted', accepted: 'accepted',
      reject: 'rejected', rejected: 'rejected',
      block: 'blocked', blocked: 'blocked',
    };
    const newStatus = statusMap[action || ''];
    if (!newStatus) throw new BadRequestException('Invalid action');

    // Only the receiver can accept/reject
    if ((newStatus === 'accepted' || newStatus === 'rejected') && connection.receiverId !== user.sub) {
      throw new ForbiddenException('Only the receiver can accept or reject');
    }

    const updated = await this.connectionsService.updateStatus(id, newStatus);
    return { success: true, data: updated };
  }

  /** DELETE /api/connections/:id — remove connection */
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const connection = await this.connectionsService.findById(id);
    if (!connection) throw new NotFoundException('Connection not found');
    if (connection.senderId !== user.sub && connection.receiverId !== user.sub) {
      throw new ForbiddenException('Not authorized for this connection');
    }
    await this.connectionsService.remove(id);
    return { success: true, message: 'Connection removed' };
  }
}
