import {
  Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { Public } from '../auth/decorators/public.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

/**
 * Resolve and create a nested upload directory.
 * Hierarchy:
 *   profiles/{userId}/          ← profile pictures
 *   documents/{userId}/{type}/  ← user documents
 *   cms/                        ← CMS images
 *   temp/                       ← unauthenticated uploads (registration)
 */
function getUploadDir(subPath: string): string {
  const dir = join(process.cwd(), 'public', 'uploads', subPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

interface SaveResult { fileName: string; size: number; ext: string; url: string }

function saveFile(
  file: Express.Multer.File | null,
  base64Data?: string,
  originalName?: string,
  subPath = 'temp',
): SaveResult | null {
  const uploadDir = getUploadDir(subPath);
  const urlBase = `/uploads/${subPath}`;

  if (file) {
    const ext = extname(file.originalname) || '.bin';
    const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    writeFileSync(join(uploadDir, fileName), file.buffer);
    return { fileName, size: file.size, ext, url: `${urlBase}/${fileName}` };
  }

  if (base64Data) {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = '.bin';
    if (matches) {
      const mimeExt: Record<string, string> = {
        'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
        'application/pdf': '.pdf', 'image/webp': '.webp',
      };
      ext = mimeExt[matches[1]] || '.bin';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }
    const extFromName = originalName ? extname(originalName) : ext;
    const usedExt = extFromName || ext;
    const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${usedExt}`;
    writeFileSync(join(uploadDir, fileName), buffer);
    return { fileName, size: buffer.length, ext: usedExt, url: `${urlBase}/${fileName}` };
  }

  return null;
}

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  // ── POST /upload — general file upload (auth required) ────────────────────
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string; name?: string; data?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const docType = body.type || 'other';

      // Choose structured subpath based on type
      let subPath: string;
      if (docType === 'profile_image' || docType === 'cover_image') {
        subPath = `profiles/${user.sub}`;
      } else {
        subPath = `documents/${user.sub}/${docType}`;
      }

      const saved = saveFile(file, body.data, body.name, subPath);
      if (!saved) return { success: false, message: 'No file provided' };

      const docName = body.name || file?.originalname || saved.fileName;
      const document = await this.uploadService.createDocument(user.sub, docName, docType, saved.url, saved.size);

      if (docType === 'profile_image') {
        await this.uploadService.updateProfileImage(user.sub, saved.url);
      } else if (docType === 'cover_image') {
        await this.uploadService.updateCoverImage(user.sub, saved.url);
      }

      return { success: true, data: document };
    } catch (error) {
      console.error('POST /upload error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /upload/local — alias for /upload ────────────────────────────────
  @Post('local')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLocal(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string; name?: string; data?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.upload(file, body, user);
  }

  // ── POST /upload/registration — public, for signup documents ──────────────
  @Public()
  @Post('registration')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRegistration(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string; name?: string; data?: string; userId?: string },
  ) {
    try {
      const docType = body.type || 'registration';
      const subPath = body.userId
        ? `documents/${body.userId}/${docType}`
        : 'temp';

      const saved = saveFile(file, body.data, body.name, subPath);
      if (!saved) return { success: false, message: 'No file provided' };

      const docName = body.name || file?.originalname || saved.fileName;

      if (body.userId) {
        const document = await this.uploadService.createDocument(body.userId, docName, docType, saved.url, saved.size);
        return { success: true, data: document };
      }

      return {
        success: true,
        data: { id: null, name: docName, type: docType, url: saved.url, size: saved.size, uploadedAt: new Date() },
      };
    } catch (error) {
      console.error('POST /upload/registration error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // ── POST /upload/cms — admin only, for CMS images ────────────────────────
  @Post('cms')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCms(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string; name?: string; data?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      const saved = saveFile(file, body.data, body.name, 'cms');
      if (!saved) return { success: false, message: 'No file provided' };

      const docName = body.name || file?.originalname || saved.fileName;
      const document = await this.uploadService.createDocument(user.sub, docName, 'cms', saved.url, saved.size);

      return { success: true, data: document };
    } catch (error) {
      console.error('POST /upload/cms error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }
}
