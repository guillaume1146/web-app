import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    const data = await this.conversationsService.listConversations(user.sub);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: { participantIds: string[] }, @CurrentUser() user: JwtPayload) {
    const data = await this.conversationsService.createConversation(user.sub, body.participantIds);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.conversationsService.findConversation(id, user.sub);
    if (!data) return { success: false, message: 'Conversation not found' };
    return { success: true, data };
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const data = await this.conversationsService.getMessages(id, user.sub, limit, offset);
    return { success: true, data };
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Body() body: { content: string }, @CurrentUser() user: JwtPayload) {
    const data = await this.conversationsService.sendMessage(id, user.sub, body.content);
    return { success: true, data };
  }

  /** POST /api/conversations/ensure-all — ensure conversations exist between user and all their booking partners */
  @Post('ensure-all')
  async ensureAll(@CurrentUser() user: JwtPayload) {
    try {
      const created = await this.conversationsService.ensureAllConversations(user.sub);
      return { success: true, created };
    } catch {
      return { success: true, created: 0 };
    }
  }
}
