import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileValidationService } from '../shared/services/file-validation.service';

@Injectable()
export class UploadService {
  constructor(
    private prisma: PrismaService,
    private fileValidation: FileValidationService,
  ) {}

  /**
   * Record a document row for a user. The caller (controller) handles raw bytes
   * — here we validate metadata, sanitize the name, and persist.
   */
  async createDocument(
    userId: string,
    name: string,
    type: string,
    url: string,
    size: number,
    mimeType?: string,
  ) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!url) throw new BadRequestException('url is required');

    this.fileValidation.validateMeta({
      mimeType: mimeType || this.inferMimeFromUrl(url),
      sizeBytes: size || 0,
      purpose: 'document',
      originalName: name,
    });

    const safeName = this.fileValidation.sanitizeFilename(name);

    const document = await this.prisma.document.create({
      data: { userId, name: safeName, type, url, size },
    });
    return {
      id: document.id,
      name: document.name,
      type: document.type,
      url: document.url,
      size: document.size,
      uploadedAt: document.uploadedAt,
    };
  }

  /** Attach a URL to the user's profile photo after validating it as an image. */
  async updateProfileImage(userId: string, url: string, sizeBytes?: number, mimeType?: string) {
    if (!userId || !url) throw new BadRequestException('userId and url are required');
    this.fileValidation.validateMeta({
      mimeType: mimeType || this.inferMimeFromUrl(url),
      sizeBytes: sizeBytes ?? 1, // metadata path ok — content scan is upstream
      purpose: 'image',
    });
    await this.prisma.user.update({ where: { id: userId }, data: { profileImage: url } });
  }

  async updateCoverImage(userId: string, url: string, sizeBytes?: number, mimeType?: string) {
    if (!userId || !url) throw new BadRequestException('userId and url are required');
    this.fileValidation.validateMeta({
      mimeType: mimeType || this.inferMimeFromUrl(url),
      sizeBytes: sizeBytes ?? 1,
      purpose: 'image',
    });
    await this.prisma.user.update({ where: { id: userId }, data: { coverImage: url } });
  }

  /** Scan raw buffer BEFORE storing. Controllers call this from multipart handlers. */
  async scanUpload(buffer: Buffer): Promise<{ clean: boolean; reason?: string }> {
    return this.fileValidation.scanBuffer(buffer);
  }

  private inferMimeFromUrl(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
      gif: 'image/gif', svg: 'image/svg+xml',
      pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return map[ext || ''] || 'application/octet-stream';
  }
}
