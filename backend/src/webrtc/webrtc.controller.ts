import { Controller, Get, Post, Patch, Delete, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { WebRtcService } from './webrtc.service';

@ApiTags('WebRTC & Video')
@Controller()
export class WebRtcController {
  constructor(private readonly webrtc: WebRtcService) {}

  /** GET /api/webrtc/session — get active session for a room */
  @Get('webrtc/session')
  async getSession(@Query('roomId') roomId: string) {
    if (!roomId) return { success: false, message: 'roomId required' };
    const data = await this.webrtc.getActiveSession(roomId);
    return { success: true, data };
  }

  /** POST /api/webrtc/session — create or join a video call session */
  @Post('webrtc/session')
  async createSession(
    @Body() body: { roomId: string; userId: string; userName?: string; userType?: string },
    @CurrentUser() _user: JwtPayload,
  ) {
    try {
      const data = await this.webrtc.createOrJoinSession(body.roomId, body.userId, body.userName);
      return { success: true, data };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Failed to create session' };
    }
  }

  /** PATCH /api/webrtc/session — update session health status */
  @Patch('webrtc/session')
  async updateSession(@Body() body: { sessionId: string; userId?: string; connectionState?: string; iceState?: string }) {
    try {
      await this.webrtc.updateSessionHealth(body.sessionId, body.connectionState);
      return { success: true };
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Update failed');
    }
  }

  /** DELETE /api/webrtc/session — end a session */
  @Delete('webrtc/session')
  async deleteSession(@Query('sessionId') sessionId: string) {
    try {
      await this.webrtc.endSession(sessionId);
      return { success: true };
    } catch (e) {
      throw new BadRequestException(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  /** POST /api/webrtc/recovery — recover a session */
  @Post('webrtc/recovery')
  async recoverSession(@Body() body: { roomId: string; userId?: string }, @CurrentUser() user: JwtPayload) {
    const requesterId = body?.userId || user?.sub;
    const result = await this.webrtc.recoverSession(body?.roomId, requesterId);
    return { success: true, ...result };
  }

  /** GET /api/video/rooms — list rooms for current user (optionally filtered by mode) */
  @Get('video/rooms')
  async getVideoRooms(
    @CurrentUser() user: JwtPayload,
    @Query('mode') mode?: string,
  ) {
    const m = mode === 'audio' || mode === 'video' ? mode : undefined;
    const data = await this.webrtc.listRoomsForUser(user.sub, m);
    return { success: true, data };
  }
}
