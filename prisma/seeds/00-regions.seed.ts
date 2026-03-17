import { PrismaClient } from '@prisma/client'

export async function seedRegions(prisma: PrismaClient) {
  const regions = [
    { id: 'REG-MU', name: 'Mauritius', countryCode: 'MU', language: 'en', flag: '🇲🇺', currency: 'MUR', currencySymbol: 'Rs', trialCredit: 4500 },
    { id: 'REG-MG', name: 'Madagascar', countryCode: 'MG', language: 'fr', flag: '🇲🇬', currency: 'MGA', currencySymbol: 'Ar', trialCredit: 180000 },
    { id: 'REG-KE', name: 'Kenya', countryCode: 'KE', language: 'en', flag: '🇰🇪', currency: 'KES', currencySymbol: 'KSh', trialCredit: 5800 },
    { id: 'REG-TG', name: 'Togo', countryCode: 'TG', language: 'fr', flag: '🇹🇬', currency: 'XOF', currencySymbol: 'CFA', trialCredit: 25000 },
    { id: 'REG-BJ', name: 'Benin', countryCode: 'BJ', language: 'fr', flag: '🇧🇯', currency: 'XOF', currencySymbol: 'CFA', trialCredit: 25000 },
    { id: 'REG-RW', name: 'Rwanda', countryCode: 'RW', language: 'en', flag: '🇷🇼', currency: 'RWF', currencySymbol: 'FRw', trialCredit: 55000 },
  ]

  for (const region of regions) {
    await prisma.region.upsert({
      where: { id: region.id },
      update: {
        currency: region.currency,
        currencySymbol: region.currencySymbol,
        trialCredit: region.trialCredit,
      },
      create: region,
    })
  }

  console.log(`  Seeded ${regions.length} regions with currency data`)
}
