import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('AI Chat')
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);
  constructor(private aiService: AiService) {}

  @Get('chat')
  async listSessions(@CurrentUser() user: JwtPayload) {
    try {
      const sessions = await this.aiService.listSessions(user.sub);
      return { success: true, data: sessions };
    } catch {
      return { success: true, data: [] };
    }
  }

  @Post('chat')
  async chat(
    @Body() body: { message: string; sessionId?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const result = await this.aiService.chatWithAssistant(user.sub, body.message, body.sessionId);
      return { success: true, data: result };
    } catch (error) {
      console.error('POST /ai/chat error:', error);
      return {
        success: true,
        data: {
          response:
            'AI assistant is temporarily unavailable. Please try again later.',
          sessionId: body.sessionId || 'temp',
          title: 'Chat',
        },
      };
    }
  }

  @Public()
  @Post('support')
  async support(@Body() body: { message: string }) {
    return {
      success: true,
      data: {
        response:
          'Our support team will get back to you shortly. In the meantime, please browse our FAQ section.',
      },
    };
  }

  /**
   * POST /api/ai/widget-chat — public endpoint for the floating Health AI
   * Assistant widget. No auth required so landing-page visitors can use it.
   * Calls Groq with a platform-specific system prompt. The authenticated
   * `POST /api/ai/chat` route serves logged-in users with full context.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('widget-chat')
  async widgetChat(@Body() body: { message: string }) {
    if (!body?.message?.trim()) {
      return { success: false, data: { response: 'Please type a message.' } };
    }
    try {
      const response = await this.aiService.publicWidgetChat(body.message);
      return { success: true, data: { response } };
    } catch (error) {
      console.error('POST /ai/widget-chat error:', error);
      return {
        success: true,
        data: {
          response:
            "I'm having trouble connecting right now. Please try again in a moment, or visit our Help Centre.",
        },
      };
    }
  }

  @Post('generate-features')
  async generateFeatures(@Body() body: any) {
    return {
      success: true,
      data: { features: ['Consultation', 'Follow-up', 'Prescription', 'Lab Tests'] },
    };
  }

  @Get('chat/:sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const result = await this.aiService.getSession(sessionId, user.sub);
      if (!result) return { success: false, message: 'Session not found' };
      return { success: true, data: result };
    } catch {
      return { success: false, message: 'Failed to fetch session' };
    }
  }

  @Delete('chat/:sessionId')
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const deleted = await this.aiService.deleteSession(sessionId, user.sub);
      if (!deleted) return { success: false, message: 'Session not found' };
      return { success: true, message: 'Session deleted' };
    } catch {
      return { success: false, message: 'Failed to delete session' };
    }
  }

  /** POST /api/ai/extract-prescription — public, extracts medicine names from a prescription image */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('extract-prescription')
  async extractPrescription(@Body() body: { image: string }) {
    if (!body?.image) return { success: false, message: 'image is required' };
    try {
      const result = await this.aiService.extractPrescription(body.image);
      return { success: true, data: result };
    } catch {
      return { success: true, data: { medicines: [], rawText: '' } };
    }
  }

  /**
   * POST /api/ai/prescriptions/extract — authenticated, richer extraction
   * Returns structured medications list with dosage + frequency, prescriber name, and date.
   * Body: { imageBase64: string, mimeType?: string }
   * The imageBase64 should be the raw base64 string (without the data: prefix) OR a full data URL.
   */
  @HttpCode(HttpStatus.OK)
  @Post('prescriptions/extract')
  async extractPrescriptionDetailed(
    @Body() body: { imageBase64: string; mimeType?: string },
    @CurrentUser() _user: JwtPayload,
  ) {
    if (!body?.imageBase64) return { success: false, message: 'imageBase64 is required' };
    try {
      // Accept both raw base64 and full data URLs
      const dataUrl = body.imageBase64.startsWith('data:')
        ? body.imageBase64
        : `data:${body.mimeType || 'image/jpeg'};base64,${body.imageBase64}`;
      const result = await this.aiService.extractPrescriptionDetailed(dataUrl);
      return { success: true, data: result };
    } catch (err) {
      this.logger.error('POST /api/prescriptions/extract error:', err);
      return { success: false, message: 'Could not read prescription. Please enter manually.' };
    }
  }
}
