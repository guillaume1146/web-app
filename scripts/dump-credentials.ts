import prisma from '../lib/db'

async function main() {
  // Pick the first (oldest) user of each type so the list is stable
  const byType = await prisma.user.findMany({
    select: { email: true, firstName: true, lastName: true, userType: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const seen = new Set<string>();
  const picks: typeof byType = [];
  for (const u of byType) {
    if (seen.has(u.userType)) continue;
    seen.add(u.userType);
    picks.push(u);
  }
  picks.sort((a, b) => a.userType.localeCompare(b.userType));
  console.log('EMAIL'.padEnd(40) + 'ROLE'.padEnd(20) + 'NAME');
  for (const u of picks) {
    console.log(u.email.padEnd(40) + u.userType.padEnd(20) + `${u.firstName} ${u.lastName}`);
  }
  await prisma.$disconnect();
}
main();
