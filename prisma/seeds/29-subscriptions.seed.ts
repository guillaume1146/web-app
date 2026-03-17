import { Prisma, PrismaClient } from '@prisma/client'
import { getEquivalentAmount } from '../../lib/currency'

// Region currency mapping
const REGION_CURRENCIES: Record<string, { currency: string; countryCode: string }> = {
  MU: { currency: 'MUR', countryCode: 'MU' },
  MG: { currency: 'MGA', countryCode: 'MG' },
  KE: { currency: 'KES', countryCode: 'KE' },
  TG: { currency: 'XOF', countryCode: 'TG' },
  BJ: { currency: 'XOF', countryCode: 'BJ' },
  RW: { currency: 'RWF', countryCode: 'RW' },
}

// Base plans defined in MUR — will be converted per region
interface PlanTemplate {
  name: string
  slugBase: string
  type: 'individual' | 'corporate'
  priceMUR: number
  targetAudience?: string
  gpConsultsPerMonth: number
  specialistConsultsPerMonth: number
  nurseConsultsPerMonth: number
  mentalHealthConsultsPerMonth: number
  nutritionConsultsPerMonth: number
  ambulanceFreePerMonth: number
  discounts: Record<string, number> | null
  paidServices: Record<string, number> | null
  features: string[]
}

const INDIVIDUAL_PLANS: PlanTemplate[] = [
  {
    name: 'Essential',
    slugBase: 'essential',
    type: 'individual',
    priceMUR: 499,
    targetAudience: 'students & young adults',
    gpConsultsPerMonth: 1,
    specialistConsultsPerMonth: 0,
    nurseConsultsPerMonth: 0,
    mentalHealthConsultsPerMonth: 0,
    nutritionConsultsPerMonth: 0,
    ambulanceFreePerMonth: 0,
    discounts: { lab: 5 },
    paidServices: null,
    features: [
      '1 GP consultation/month',
      'Chat with a doctor',
      'E-prescriptions',
      'Digital health record',
      'Pharmacy ordering',
      '5% lab test discount',
    ],
  },
  {
    name: 'Plus',
    slugBase: 'plus',
    type: 'individual',
    priceMUR: 799,
    targetAudience: 'families',
    gpConsultsPerMonth: 1,
    specialistConsultsPerMonth: 0,
    nurseConsultsPerMonth: 0,
    mentalHealthConsultsPerMonth: 0,
    nutritionConsultsPerMonth: 1,
    ambulanceFreePerMonth: 0,
    discounts: { lab: 10, pharmacy: 10 },
    paidServices: null,
    features: [
      '1 GP consultation/month',
      '1 nutrition consultation/month',
      'Priority booking',
      '10% lab & pharmacy discounts',
      'Chat with a doctor',
      'E-prescriptions',
      'Digital health record',
    ],
  },
  {
    name: 'Premium',
    slugBase: 'premium',
    type: 'individual',
    priceMUR: 1399,
    targetAudience: 'health-conscious individuals',
    gpConsultsPerMonth: 2,
    specialistConsultsPerMonth: 0,
    nurseConsultsPerMonth: 0,
    mentalHealthConsultsPerMonth: 1,
    nutritionConsultsPerMonth: 0,
    ambulanceFreePerMonth: 1,
    discounts: { specialist: 20, lab: 10 },
    paidServices: null,
    features: [
      '2 GP consultations/month',
      '1 mental health consultation/month',
      '1 free ambulance call/month',
      '20% specialist discount',
      '10% lab discount',
      'Priority booking',
      'Annual health screening',
      'Medicine delivery',
    ],
  },
]

const CORPORATE_PLANS: PlanTemplate[] = [
  {
    name: 'Corp Essential',
    slugBase: 'corp-essential',
    type: 'corporate',
    priceMUR: 399,
    targetAudience: 'small businesses',
    gpConsultsPerMonth: 1,
    specialistConsultsPerMonth: 0,
    nurseConsultsPerMonth: 0,
    mentalHealthConsultsPerMonth: 0,
    nutritionConsultsPerMonth: 0,
    ambulanceFreePerMonth: 0,
    discounts: { gp: 10, pharmacy: 5 },
    paidServices: null,
    features: [
      '1 GP consultation/month per employee',
      '10% GP discount',
      '5% pharmacy discount',
      'Digital sick certificates',
      'HR dashboard',
      'E-prescriptions',
    ],
  },
  {
    name: 'Corp Plus',
    slugBase: 'corp-plus',
    type: 'corporate',
    priceMUR: 699,
    targetAudience: 'medium businesses',
    gpConsultsPerMonth: 1,
    specialistConsultsPerMonth: 0,
    nurseConsultsPerMonth: 1,
    mentalHealthConsultsPerMonth: 0,
    nutritionConsultsPerMonth: 1,
    ambulanceFreePerMonth: 0,
    discounts: { lab: 10, pharmacy: 10, specialist: 10 },
    paidServices: null,
    features: [
      '1 GP consultation/month per employee',
      '1 nurse consultation/month',
      '1 nutrition consultation/month',
      '10% lab, pharmacy & specialist discounts',
      'Employee analytics',
      'HR dashboard',
      'Digital sick certificates',
    ],
  },
  {
    name: 'Corp Premium',
    slugBase: 'corp-premium',
    type: 'corporate',
    priceMUR: 999,
    targetAudience: 'large businesses',
    gpConsultsPerMonth: 2,
    specialistConsultsPerMonth: 0,
    nurseConsultsPerMonth: 2,
    mentalHealthConsultsPerMonth: 1,
    nutritionConsultsPerMonth: 1,
    ambulanceFreePerMonth: 0,
    discounts: { specialist: 20, lab: 15, pharmacy: 10 },
    paidServices: null,
    features: [
      '2 GP consultations/month per employee',
      '2 nurse consultations/month',
      '1 mental health consultation/month',
      '1 nutrition consultation/month',
      '20% specialist, 15% lab, 10% pharmacy discounts',
      'Wellness programs',
      'Employee analytics',
      'HR dashboard',
    ],
  },
  {
    name: 'Enterprise',
    slugBase: 'enterprise',
    type: 'corporate',
    priceMUR: 1199,
    targetAudience: 'enterprise organizations',
    gpConsultsPerMonth: 2,
    specialistConsultsPerMonth: 0,
    nurseConsultsPerMonth: 2,
    mentalHealthConsultsPerMonth: 1,
    nutritionConsultsPerMonth: 1,
    ambulanceFreePerMonth: 0,
    discounts: { specialist: 25, lab: 20, pharmacy: 15, volume_50: 5, volume_100: 10, volume_300: 15 },
    paidServices: null,
    features: [
      'Full MediWyz ecosystem access',
      '2 GP consultations/month per employee',
      '2 nurse consultations/month',
      '1 mental health consultation/month',
      '1 nutrition consultation/month',
      '25% specialist, 20% lab, 15% pharmacy discounts',
      'Volume discounts (50+ employees)',
      'Dedicated account manager',
      'Custom wellness programs',
      'Full analytics & reporting',
      'Priority support',
    ],
  },
]

export async function seedSubscriptions(prisma: PrismaClient) {
  console.log('  Seeding subscription plans...')

  const allPlans = [...INDIVIDUAL_PLANS, ...CORPORATE_PLANS]
  let totalSeeded = 0

  for (const [countryCode, { currency }] of Object.entries(REGION_CURRENCIES)) {
    for (const plan of allPlans) {
      const price = currency === 'MUR' ? plan.priceMUR : getEquivalentAmount(plan.priceMUR, currency)
      const slug = `${plan.slugBase}-${countryCode.toLowerCase()}`

      const discountsVal = plan.discounts ?? Prisma.JsonNull
      const paidServicesVal = plan.paidServices ?? Prisma.JsonNull

      await prisma.subscriptionPlan.upsert({
        where: { slug },
        update: {
          price,
          currency,
          discounts: discountsVal,
          paidServices: paidServicesVal,
          nurseConsultsPerMonth: plan.nurseConsultsPerMonth,
          mentalHealthConsultsPerMonth: plan.mentalHealthConsultsPerMonth,
          nutritionConsultsPerMonth: plan.nutritionConsultsPerMonth,
          ambulanceFreePerMonth: plan.ambulanceFreePerMonth,
          targetAudience: plan.targetAudience ?? null,
          features: plan.features,
        },
        create: {
          name: plan.name,
          slug,
          type: plan.type,
          price,
          currency,
          countryCode,
          targetAudience: plan.targetAudience ?? null,
          gpConsultsPerMonth: plan.gpConsultsPerMonth,
          specialistConsultsPerMonth: plan.specialistConsultsPerMonth,
          nurseConsultsPerMonth: plan.nurseConsultsPerMonth,
          mentalHealthConsultsPerMonth: plan.mentalHealthConsultsPerMonth,
          nutritionConsultsPerMonth: plan.nutritionConsultsPerMonth,
          ambulanceFreePerMonth: plan.ambulanceFreePerMonth,
          discounts: discountsVal,
          paidServices: paidServicesVal,
          features: plan.features,
        },
      })
      totalSeeded++
    }
  }

  console.log(`  ✓ ${totalSeeded} subscription plans seeded (${allPlans.length} plans × ${Object.keys(REGION_CURRENCIES).length} regions)`)
}
