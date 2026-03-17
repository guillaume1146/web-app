import { PrismaClient } from '@prisma/client'

export async function seedWallets(prisma: PrismaClient) {
  console.log('  Seeding wallets...')

  // Get all users with their region data for currency-aware wallet creation
  const users = await prisma.user.findMany({
    select: { id: true, regionId: true },
  })

  // Cache region data to avoid repeated queries
  const regionCache: Record<string, { currency: string; trialCredit: number }> = {}
  const regions = await prisma.region.findMany({
    select: { id: true, currency: true, trialCredit: true },
  })
  for (const r of regions) {
    regionCache[r.id] = { currency: r.currency, trialCredit: r.trialCredit }
  }

  for (const user of users) {
    const region = user.regionId ? regionCache[user.regionId] : null
    const currency = region?.currency ?? 'MUR'
    const trialCredit = region?.trialCredit ?? 4500

    await prisma.userWallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balance: trialCredit,
        currency,
        initialCredit: trialCredit,
      },
    })
  }

  // Add sample transactions for first patient and first doctor
  const patient = await prisma.user.findFirst({
    where: { userType: 'PATIENT' },
    select: { id: true, wallet: { select: { id: true, balance: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const doctor = await prisma.user.findFirst({
    where: { userType: 'DOCTOR' },
    select: { id: true, wallet: { select: { id: true, balance: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (patient?.wallet) {
    const transactions = [
      { description: 'Video consultation with Dr. Sarah Johnson', serviceType: 'consultation', amount: 1500 },
      { description: 'Paracetamol 500mg x2 boxes', serviceType: 'medicine', amount: 90 },
      { description: 'Complete Blood Count (CBC)', serviceType: 'lab_test', amount: 500 },
      { description: 'Monthly subscription - Premium Care', serviceType: 'subscription', amount: 250 },
    ]

    let balance = patient.wallet.balance
    for (const tx of transactions) {
      const balanceBefore = balance
      balance -= tx.amount
      await prisma.walletTransaction.create({
        data: {
          walletId: patient.wallet.id,
          type: 'debit',
          amount: tx.amount,
          description: tx.description,
          serviceType: tx.serviceType,
          balanceBefore,
          balanceAfter: balance,
          status: 'completed',
        },
      })
    }

    await prisma.userWallet.update({
      where: { id: patient.wallet.id },
      data: { balance },
    })
  }

  if (doctor?.wallet) {
    const txs = [
      { description: 'Professional subscription plan', serviceType: 'subscription', amount: 1999 },
    ]

    let balance = doctor.wallet.balance
    for (const tx of txs) {
      const balanceBefore = balance
      balance -= tx.amount
      await prisma.walletTransaction.create({
        data: {
          walletId: doctor.wallet.id,
          type: 'debit',
          amount: tx.amount,
          description: tx.description,
          serviceType: tx.serviceType,
          balanceBefore,
          balanceAfter: balance,
          status: 'completed',
        },
      })
    }

    await prisma.userWallet.update({
      where: { id: doctor.wallet.id },
      data: { balance },
    })
  }

  console.log(`  Wallets created for ${users.length} users with sample transactions`)
}
