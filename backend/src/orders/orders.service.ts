import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TreasuryService } from '../shared/services/treasury.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private treasury: TreasuryService,
  ) {}

  async list(userId: string, page?: string) {
    const take = 20;
    const pageNum = Math.max(parseInt(page || '1'), 1);

    const patientProfile = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!patientProfile) return { orders: [], pagination: { page: 1, limit: take, totalCount: 0, totalPages: 0 } };

    const [orders, totalCount] = await Promise.all([
      this.prisma.medicineOrder.findMany({
        where: { patientId: patientProfile.id },
        select: {
          id: true, status: true, totalAmount: true, pharmacy: true, orderedAt: true, deliveredAt: true,
          items: { select: { id: true, quantity: true, price: true, pharmacyMedicine: { select: { name: true, dosageForm: true, strength: true } } } },
        },
        orderBy: { orderedAt: 'desc' }, take, skip: (pageNum - 1) * take,
      }),
      this.prisma.medicineOrder.count({ where: { patientId: patientProfile.id } }),
    ]);

    return { orders, pagination: { page: pageNum, limit: take, totalCount, totalPages: Math.ceil(totalCount / take) } };
  }

  async createOrder(userId: string, items: Array<{ pharmacyMedicineId: string; quantity: number }>) {
    if (!items?.length) throw new BadRequestException('At least one item is required');

    // Ensure patient profile
    let patientProfile = await this.prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!patientProfile) {
      const { randomUUID } = require('crypto');
      patientProfile = await this.prisma.patientProfile.create({
        data: { userId, nationalId: `AUTO-${randomUUID().slice(0, 12).toUpperCase()}`, bloodType: 'Unknown', allergies: [], chronicConditions: [], healthScore: 50 },
        select: { id: true },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Fetch medicines
      const medicines = await Promise.all(
        items.map(item => tx.pharmacyMedicine.findUnique({
          where: { id: item.pharmacyMedicineId },
          select: { id: true, name: true, price: true, quantity: true, inStock: true, isActive: true, requiresPrescription: true, pharmacist: { select: { pharmacyName: true, userId: true } } },
        }))
      );

      // Validate stock
      const unavailable: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const med = medicines[i];
        if (!med || !med.isActive) unavailable.push(`${items[i].pharmacyMedicineId}: not found or inactive`);
        else if (!med.inStock) unavailable.push(`${med.name}: out of stock`);
        else if (med.quantity < items[i].quantity) unavailable.push(`${med.name}: only ${med.quantity} available`);
      }
      if (unavailable.length > 0) throw new BadRequestException(`Items unavailable: ${unavailable.join(', ')}`);

      // Check prescription requirements
      const rxRequired = medicines.filter(m => m?.requiresPrescription).map(m => m!.name);
      if (rxRequired.length > 0) {
        const covered = await tx.prescriptionMedicine.findMany({
          where: { prescription: { patientId: patientProfile!.id, isActive: true }, medicine: { name: { in: rxRequired } } },
          select: { medicine: { select: { name: true } } },
        });
        const coveredSet = new Set(covered.map(c => c.medicine.name));
        const uncovered = rxRequired.filter(n => !coveredSet.has(n));
        if (uncovered.length > 0) throw new BadRequestException(`Prescription required for: ${uncovered.join(', ')}`);
      }

      // Calculate total
      const total = items.reduce((sum, item, i) => sum + medicines[i]!.price * item.quantity, 0);

      // Check wallet
      const wallet = await tx.userWallet.findUnique({ where: { userId }, select: { id: true, balance: true } });
      if (!wallet || wallet.balance < total) {
        throw new BadRequestException(`Insufficient balance. Required: ${total}, Available: ${wallet?.balance ?? 0}`);
      }

      // Deduct balance
      await tx.userWallet.update({ where: { id: wallet.id }, data: { balance: wallet.balance - total } });
      await tx.walletTransaction.create({
        data: { walletId: wallet.id, type: 'debit', amount: total, description: `Medicine order: ${items.length} item(s)`, serviceType: 'medicine', balanceBefore: wallet.balance, balanceAfter: wallet.balance - total },
      });

      // Upsert Medicine records
      const medicineRecords = await Promise.all(
        medicines.map(med => tx.medicine.upsert({ where: { name: med!.name }, update: {}, create: { name: med!.name, category: 'General' } }))
      );

      // Create order
      const order = await tx.medicineOrder.create({
        data: {
          patientId: patientProfile!.id, status: 'confirmed', totalAmount: total, pharmacy: medicines[0]!.pharmacist.pharmacyName,
          items: { create: items.map((item, i) => ({ medicineId: medicineRecords[i].id, pharmacyMedicineId: item.pharmacyMedicineId, quantity: item.quantity, price: medicines[i]!.price })) },
        },
        select: { id: true, status: true, totalAmount: true, pharmacy: true, orderedAt: true },
      });

      // Decrement stock
      await Promise.all(items.map((item, i) =>
        tx.pharmacyMedicine.update({ where: { id: item.pharmacyMedicineId }, data: { quantity: { decrement: item.quantity }, inStock: medicines[i]!.quantity - item.quantity > 0 } })
      ));

      // Credit pharmacists (85% each — platform keeps 15% to match inventory flow)
      const pharmacistTotals = new Map<string, number>();
      for (let i = 0; i < items.length; i++) {
        const pid = medicines[i]!.pharmacist.userId;
        pharmacistTotals.set(pid, (pharmacistTotals.get(pid) ?? 0) + medicines[i]!.price * items[i].quantity);
      }
      let totalPlatformFee = 0;
      for (const [pharmacistUserId, grossAmount] of pharmacistTotals) {
        const platformFee = Math.round(grossAmount * 0.15 * 100) / 100;
        const pharmacistAmount = grossAmount - platformFee;
        totalPlatformFee += platformFee;
        const pw = await tx.userWallet.findUnique({ where: { userId: pharmacistUserId }, select: { id: true, balance: true } });
        if (pw) {
          await tx.userWallet.update({ where: { id: pw.id }, data: { balance: pw.balance + pharmacistAmount } });
          await tx.walletTransaction.create({
            data: {
              walletId: pw.id, type: 'credit', amount: pharmacistAmount,
              description: `Medicine sale — Order #${order.id.slice(0, 8)}`,
              serviceType: 'medicine', referenceId: order.id,
              balanceBefore: pw.balance, balanceAfter: pw.balance + pharmacistAmount,
              status: 'completed', platformCommission: platformFee, providerAmount: pharmacistAmount,
            },
          });
        }
      }
      // Platform 15% → PlatformTreasury. Previously this flow took 0% fee
      // (inconsistent with inventory); audit flagged the gap Apr 2026.
      if (totalPlatformFee > 0) {
        await this.treasury.creditPlatformFee(tx, {
          amount: totalPlatformFee,
          source: 'medicine_order',
          referenceId: order.id,
          description: `Medicine order ${order.id.slice(0, 8)} platform fee`,
        });
      }

      return {
        orderId: order.id, status: order.status, totalAmount: total, walletBalance: wallet.balance - total,
        items: items.map((item, i) => ({ pharmacyMedicineId: item.pharmacyMedicineId, name: medicines[i]!.name, quantity: item.quantity, price: medicines[i]!.price, subtotal: medicines[i]!.price * item.quantity })),
      };
    });
  }
}
