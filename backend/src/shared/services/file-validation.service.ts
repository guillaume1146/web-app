import { Injectable, BadRequestException, Logger } from '@nestjs/common';

/**
 * Centralized file validation + virus-scan hook.
 *
 * The virus scan is implemented as a hook (swap in ClamAV, Azure Defender,
 * etc. without touching callers). Default impl rejects known bad MIME
 * signatures and oversize files but performs no content scan. When an
 * external scanner is wired, replace `scanBuffer()` in-place.
 */
@Injectable()
export class FileValidationService {
  private readonly logger = new Logger(FileValidationService.name);

  // Hard size caps by category — prevents DoS via huge uploads.
  private static readonly MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // 8 MB
  private static readonly MAX_DOC_BYTES   = 20 * 1024 * 1024;  // 20 MB
  private static readonly MAX_ANY_BYTES   = 25 * 1024 * 1024;  // hard ceiling

  // Allow-lists by purpose (intentional — deny everything else)
  private static readonly ALLOWED_IMAGES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  ]);
  private static readonly ALLOWED_DOCS = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'image/jpeg', 'image/png', 'image/webp', // scanned docs as images
  ]);

  /** Validate file metadata (no content scan). Throws on failure. */
  validateMeta(params: {
    mimeType: string | undefined;
    sizeBytes: number;
    purpose: 'image' | 'document';
    originalName?: string;
  }) {
    const { mimeType, sizeBytes, purpose, originalName } = params;
    if (!mimeType) throw new BadRequestException('File mime type is required');
    if (!sizeBytes || sizeBytes <= 0) throw new BadRequestException('File is empty');
    if (sizeBytes > FileValidationService.MAX_ANY_BYTES) {
      throw new BadRequestException('File is too large');
    }

    const limit = purpose === 'image'
      ? FileValidationService.MAX_IMAGE_BYTES
      : FileValidationService.MAX_DOC_BYTES;
    if (sizeBytes > limit) {
      const mb = Math.round(limit / 1024 / 1024);
      throw new BadRequestException(`${purpose === 'image' ? 'Image' : 'Document'} must be smaller than ${mb} MB`);
    }

    const allowed = purpose === 'image'
      ? FileValidationService.ALLOWED_IMAGES
      : FileValidationService.ALLOWED_DOCS;
    if (!allowed.has(mimeType.toLowerCase())) {
      throw new BadRequestException(`Unsupported file type: ${mimeType}`);
    }

    if (originalName) {
      const bad = /\.(exe|bat|cmd|sh|ps1|msi|jar|dll|vbs|scr|app)$/i;
      if (bad.test(originalName)) {
        throw new BadRequestException('Executable files are not allowed');
      }
    }
  }

  /** Sanitize a user-supplied filename. Strips path components and dangerous chars. */
  sanitizeFilename(name: string): string {
    return (name || 'file')
      .split(/[\\/]/).pop()!                  // strip path
      .replace(/[^\w.\- ]+/g, '_')            // non-alphanum → _
      .replace(/^\.+/, '')                    // no leading dots
      .slice(0, 200) || 'file';               // cap length
  }

  /**
   * Virus-scan hook. Default: magic-byte sniffing for a few known nasties.
   * Swap this method for a real AV integration (clamd, S3 event + Lambda,
   * Azure Defender file scan, etc.) without touching callers.
   *
   * Returns `{ clean: true }` when safe, `{ clean: false, reason }` when not.
   */
  async scanBuffer(buffer: Buffer): Promise<{ clean: boolean; reason?: string }> {
    if (!buffer || buffer.length === 0) return { clean: false, reason: 'empty buffer' };

    // EICAR test string — standard test file every AV product detects
    const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    if (buffer.includes(Buffer.from(eicar))) {
      return { clean: false, reason: 'EICAR test signature detected' };
    }

    // Reject files whose magic bytes announce a Windows PE (exe/dll)
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { clean: false, reason: 'executable binary detected' };
    }

    // Reject shell script shebangs
    if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
      return { clean: false, reason: 'shell script detected' };
    }

    return { clean: true };
  }
}
