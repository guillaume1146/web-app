import { PrismaClient } from '@prisma/client'

export async function seedDocumentsAndEnrichment(prisma: PrismaClient) {
  console.log('📄 Seeding documents and enriching data...')

  // ── Documents ──────────────────────────────────────────────────────────
  const patients = await prisma.user.findMany({
    where: { userType: 'MEMBER' },
    select: { id: true, firstName: true },
    take: 5,
  })

  const doctors = await prisma.user.findMany({
    where: { userType: 'DOCTOR' },
    select: { id: true, firstName: true },
    take: 3,
  })

  const documentRecords = []

  for (const patient of patients) {
    documentRecords.push(
      {
        userId: patient.id,
        name: `${patient.firstName}_ID_Card.pdf`,
        type: 'id_proof',
        url: `https://storage.googleapis.com/mediwyz-uploads/users/${patient.id}/id_proof/sample.pdf`,
        size: 245000,
      },
      {
        userId: patient.id,
        name: `Blood_Test_Results_2025.pdf`,
        type: 'lab_report',
        url: `https://storage.googleapis.com/mediwyz-uploads/users/${patient.id}/lab_report/cbc_2025.pdf`,
        size: 180000,
      },
    )
  }

  for (const doctor of doctors) {
    documentRecords.push(
      {
        userId: doctor.id,
        name: `Medical_License.pdf`,
        type: 'id_proof',
        url: `https://storage.googleapis.com/mediwyz-uploads/users/${doctor.id}/id_proof/license.pdf`,
        size: 320000,
      },
      {
        userId: doctor.id,
        name: `Insurance_Certificate.pdf`,
        type: 'insurance',
        url: `https://storage.googleapis.com/mediwyz-uploads/users/${doctor.id}/insurance/cert.pdf`,
        size: 150000,
      },
    )
  }

  await prisma.document.createMany({ data: documentRecords, skipDuplicates: true })

  // ── More wallet transactions for admin revenue metrics ──────────────────
  // Add transactions for additional patients to give richer revenue data
  const allPatients = await prisma.user.findMany({
    where: { userType: 'MEMBER' },
    select: { id: true, wallet: { select: { id: true, balance: true } } },
    take: 5,
    skip: 1, // Skip first patient (already has transactions)
  })

  const sampleTransactions = [
    { description: 'In-person consultation', serviceType: 'consultation', amount: 800 },
    { description: 'Home nurse visit', serviceType: 'consultation', amount: 400 },
    { description: 'Pharmacy order - antibiotics', serviceType: 'medicine', amount: 250 },
    { description: 'X-Ray imaging', serviceType: 'lab_test', amount: 750 },
    { description: 'Video consultation', serviceType: 'consultation', amount: 350 },
  ]

  for (const patient of allPatients) {
    if (!patient.wallet) continue

    // Each patient gets 2-3 random transactions
    const count = 2 + Math.floor(Math.random() * 2)
    let balance = patient.wallet.balance

    for (let i = 0; i < count; i++) {
      const tx = sampleTransactions[i % sampleTransactions.length]
      if (balance < tx.amount) continue

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

    if (balance !== patient.wallet.balance) {
      await prisma.userWallet.update({
        where: { id: patient.wallet.id },
        data: { balance },
      })
    }
  }

  console.log(`  ✅ Created ${documentRecords.length} documents, enriched wallet transactions`)
}
