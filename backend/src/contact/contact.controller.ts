import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Contact')
@Controller('contact')
@Public()
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post()
  async submit(@Body() body: { name: string; email: string; subject: string; message: string }) {
    await this.contactService.submit(body);
    return { success: true, message: 'Message sent successfully' };
  }
}
