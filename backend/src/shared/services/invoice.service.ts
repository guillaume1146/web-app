import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface GenerateInvoiceParams {
  patientUserId: string;
  providerUserId: string;
  bookingId?: string;
  orderId?: string;
  type: 'booking_payment' | 'health_shop_order' | 'subscription';
  amount: number;
  platformFee?: number;
  providerAmount?: number;
  description: string;
  items?: Record<string, unknown>[];
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate an invoice with auto-generated invoice number (INV-YYYYMMDD-XXXXXX)
   */
  async generateInvoice(data: GenerateInvoiceParams) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random6 = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${random6}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        patientUserId: data.patientUserId,
        providerUserId: data.providerUserId,
        bookingId: data.bookingId || null,
        orderId: data.orderId || null,
        type: data.type,
        amount: data.amount,
        platformFee: data.platformFee ?? 0,
        providerAmount: data.providerAmount ?? 0,
        description: data.description,
        items: data.items ? (data.items as any) : null,
      },
    });

    this.logger.log(`Invoice ${invoiceNumber} generated: ${data.type}, amount=${data.amount}`);
    return invoice;
  }

  /**
   * Get all invoices for a user (as patient or provider)
   */
  async getInvoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: {
        OR: [
          { patientUserId: userId },
          { providerUserId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoiceById(id: string) {
    return this.prisma.invoice.findUnique({ where: { id } });
  }
}
