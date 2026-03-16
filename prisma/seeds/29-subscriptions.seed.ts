import { PrismaClient } from '@prisma/client'

export async function seedSubscriptions(prisma: PrismaClient) {
  console.log('  Seeding subscription plans...')

  await prisma.subscriptionPlan.createMany({
    data: [
      // ── Individual Plans ──
      {
        name: 'Essential',
        slug: 'essential',
        type: 'individual',
        price: 250,
        currency: 'MUR',
        gpConsultsPerMonth: 1,
        specialistConsultsPerMonth: 0,
        features: [
          'Chat with a doctor',
          'E-prescriptions',
          'Digital health record',
          'Pharmacy ordering',
        ],
      },
      {
        name: 'Plus',
        slug: 'plus',
        type: 'individual',
        price: 500,
        currency: 'MUR',
        gpConsultsPerMonth: -1,
        specialistConsultsPerMonth: 0,
        features: [
          'Unlimited GP consultations',
          'Priority booking',
          'Lab test discounts',
          'Pharmacy discounts',
          'Nutrition consultation',
          'Chat with a doctor',
          'E-prescriptions',
          'Digital health record',
        ],
      },
      {
        name: 'Premium',
        slug: 'premium',
        type: 'individual',
        price: 950,
        currency: 'MUR',
        gpConsultsPerMonth: -1,
        specialistConsultsPerMonth: 2,
        features: [
          'Unlimited GP consultations',
          '2 free specialist consultations/month',
          'Annual health screening',
          'Home lab sample collection',
          'Mental health support',
          'Medicine delivery',
          'Vaccination reminders',
          'Priority booking',
          'Lab & pharmacy discounts',
        ],
      },

      // ── Corporate Plans ──
      {
        name: 'Corp Essential',
        slug: 'corp-essential',
        type: 'corporate',
        price: 140,
        currency: 'MUR',
        gpConsultsPerMonth: 1,
        specialistConsultsPerMonth: 0,
        features: [
          'Chat with a doctor',
          'Digital sick certificates',
          'HR dashboard',
          'E-prescriptions',
          'Digital health record',
        ],
      },
      {
        name: 'Corp Plus',
        slug: 'corp-plus',
        type: 'corporate',
        price: 270,
        currency: 'MUR',
        gpConsultsPerMonth: -1,
        specialistConsultsPerMonth: 0,
        features: [
          'Unlimited GP consultations',
          'Mental health counselling',
          'Lab test discounts',
          'Employee analytics',
          'HR dashboard',
          'Digital sick certificates',
        ],
      },
      {
        name: 'Corp Premium',
        slug: 'corp-premium',
        type: 'corporate',
        price: 450,
        currency: 'MUR',
        gpConsultsPerMonth: -1,
        specialistConsultsPerMonth: 2,
        features: [
          'Unlimited GP consultations',
          '2 free specialist consultations/month',
          'Annual health screening',
          'Wellness programs',
          'Pharmacy discounts',
          'Mental health counselling',
          'Employee analytics',
          'HR dashboard',
        ],
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        type: 'corporate',
        price: 600,
        currency: 'MUR',
        gpConsultsPerMonth: -1,
        specialistConsultsPerMonth: -1,
        features: [
          'Full MediWyz ecosystem access',
          'Unlimited GP & specialist consultations',
          'Onsite health screening',
          'Chronic disease management programs',
          'Dedicated account manager',
          'Custom wellness programs',
          'Full analytics & reporting',
          'Priority support',
        ],
      },
    ],
  })

  console.log('  ✓ 7 subscription plans seeded')
}
