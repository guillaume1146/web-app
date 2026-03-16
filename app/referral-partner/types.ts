import { IconType } from 'react-icons'

export interface ReferralPartnerData {
  name: string
  email: string
  avatar: string
  memberSince: string
  partnerLevel: 'Bronze' | 'Silver' | 'Gold' | 'Diamond'
  promoCode: string
  stats: ReferralStats
  earnings: EarningsData
  leadsBySource: LeadSourceData[]
  recentConversions: ConversionData[]
}

export interface ReferralStats {
  totalEarnings: number
  totalReferrals: number
  conversionRate: number
  thisMonthEarnings: number
  thisMonthReferrals: number
  pendingPayouts: number
}

export interface EarningsData {
  totalRevenue: number
  paidOut: number
  pending: number
  nextPayoutDate: string
}

export interface LeadSourceData {
  source: string
  visitors: number
  conversions: number
  conversionRate: number
  earnings: number
  utmLink: string
}

export interface ConversionData {
  id: string
  customerName: string
  planType: string
  conversionDate: string
  commission: number
  status: 'pending' | 'paid' | 'processing' | 'completed'
}

export interface UTMSource {
  name: string
  platform: string
  icon: IconType
  color: string
}

export type { DashboardStatCardProps as StatCardProps } from '@/components/shared/DashboardStatCard'

// Settings related types
export interface ReferralPartnerSettings {
  name: string
  email: string
  phone: string
  address: string
  dateOfBirth: string
  businessType: string
  taxId: string
}

export interface BillingSettings {
  accountType: 'MCB Juice' | 'Bank Transfer' | 'Mobile Money'
  accountDetails: {
    accountNumber: string
    accountName: string
    bankName: string
  }
  mcbJuiceNumber: string
  payoutFrequency: 'weekly' | 'monthly' | 'quarterly'
}

export interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  conversionAlerts: boolean
  payoutNotifications: boolean
  weeklyReports: boolean
  marketingTips: boolean
}

export type ActiveTab = 'profile' | 'billing' | 'notifications' | 'documents'