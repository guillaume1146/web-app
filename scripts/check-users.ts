import prisma from '../lib/db'
async function main() {
  const counts = await prisma.user.groupBy({ by: ['userType'], _count: true });
  console.log('User counts by userType:');
  for (const c of counts) console.log(`  ${c.userType}: ${c._count}`);
  const total = counts.reduce((s, c) => s + c._count, 0);
  console.log(`TOTAL: ${total}`);
  await prisma.$disconnect();
}
main();
