import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Bootstraps the super admin user from environment variables on startup.
 * Replaces the ensureSuperAdmin() function from server.js.
 */
@Injectable()
export class SuperAdminBootstrap implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureSuperAdmin();
    } catch (error: any) {
      console.error('Super admin bootstrap error:', error.message);
    }
  }

  private async ensureSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!email || !password) return;

    const hashed = await bcrypt.hash(password, 12);
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      // Always sync password + status from .env so the super admin can always log in
      await this.prisma.user.update({
        where: { email },
        data: { password: hashed, accountStatus: 'active', verified: true },
      });
      return;
    }

    await this.prisma.user.create({
      data: {
        firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Admin',
        lastName: process.env.SUPER_ADMIN_LAST_NAME || 'MediWyz',
        email,
        password: hashed,
        phone: '+230-0000-0000',
        userType: 'REGIONAL_ADMIN',
        accountStatus: 'active',
        verified: true,
        regionalAdminProfile: { create: { region: 'National', country: 'Mauritius' } },
      },
    });
    console.log('Super admin created from .env:', email);
  }
}
