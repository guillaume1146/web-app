import { PrismaClient } from '@prisma/client';
import { seedIconKeys } from '../seeds/56-icon-keys.seed';

const prisma = new PrismaClient();

seedIconKeys()
  .then(() => console.log('Done.'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
