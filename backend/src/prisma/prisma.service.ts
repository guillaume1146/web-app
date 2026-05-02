import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { resolve } from 'path';

/**
 * Dynamically load PrismaClient from the root project's node_modules
 * where `prisma generate` was run. This avoids the ESM/CJS mismatch
 * in Prisma v6 when the backend has its own node_modules.
 */
function loadPrismaClient() {
  // Try backend's own node_modules first
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@prisma/client');
    const Client = mod.PrismaClient || mod.default?.PrismaClient;
    if (Client) {
      // Verify it's actually initialized (not the ESM stub)
      try { new Client(); return Client; } catch { /* fall through */ }
    }
  } catch { /* fall through */ }

  // Fall back to root node_modules (where prisma generate outputs by default)
  const rootPath = resolve(__dirname, '..', '..', '..', 'node_modules', '@prisma', 'client');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rootMod = require(rootPath);
  return rootMod.PrismaClient || rootMod.default?.PrismaClient;
}

const PrismaClient = loadPrismaClient();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
