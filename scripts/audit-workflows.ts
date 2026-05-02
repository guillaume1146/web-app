import prisma from '../lib/db'

async function main() {
  const tpls = await prisma.workflowTemplate.findMany({
    select: { id: true, name: true, slug: true, providerType: true, serviceMode: true, steps: true, transitions: true },
  });
  console.log(`Total templates: ${tpls.length}`);
  const byStepCount: Record<number, number> = {};
  let longest = { count: 0, name: '', slug: '' };
  for (const t of tpls) {
    const steps = Array.isArray(t.steps) ? (t.steps as any[]) : [];
    const n = steps.length;
    byStepCount[n] = (byStepCount[n] ?? 0) + 1;
    if (n > longest.count) longest = { count: n, name: t.name, slug: t.slug };
  }
  console.log('Step-count distribution:');
  Object.keys(byStepCount).sort((a, b) => Number(a) - Number(b)).forEach(k => {
    console.log(`  ${k} steps: ${byStepCount[Number(k)]} templates`);
  });
  console.log(`\nLongest template: ${longest.name} (${longest.slug}) — ${longest.count} steps`);

  // Sample the longest template
  const sample = tpls.find(t => t.slug === longest.slug);
  if (sample) {
    const steps = sample.steps as any[];
    console.log('\n--- Longest template steps ---');
    for (const s of steps) {
      const pa = Array.isArray(s.actionsForPatient) ? s.actionsForPatient.length : 0;
      const pr = Array.isArray(s.actionsForProvider) ? s.actionsForProvider.length : 0;
      const flags = Object.keys(s.flags || {}).filter(k => (s.flags as any)[k]).join(',') || 'none';
      const notify = (s.notifyPatient ? 'patient ' : '') + (s.notifyProvider ? 'provider' : '');
      console.log(`  ${s.order}. ${s.statusCode} — patient:${pa} provider:${pr} | flags:${flags} | notify:${notify || 'none'}`);
    }
  }
  await prisma.$disconnect();
}
main();
