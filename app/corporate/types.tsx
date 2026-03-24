export type { DashboardStatCardProps as StatCardProps } from '@/components/shared/DashboardStatCard'

export interface CorporateStats {
 totalEmployees: number
 activePolicyHolders: number
 pendingVerifications: number
 approvedClaims: number
 pendingClaims: number
 rejectedClaims: number
 monthlyContribution: number
 totalClaims: number
}

export interface Employee {
 id: string
 name: string
 email: string
 department: string
 policyType: string
 status: 'active' | 'pending' | 'inactive'
 joinDate: string
 lastActivity: string
}

export interface ClaimsData {
 id: string
 employeeName: string
 claimType: string
 amount: number
 status: 'approved' | 'pending' | 'rejected'
 date: string
 description: string
}

export interface CorporateProfile {
 companyName: string
 adminName: string
 email: string
 phone: string
 companyAddress: string
 taxId: string
 sector: string
 logo: string
 description: string
 website: string
 employeeCount: number
}

export interface PaymentMethod {
 id: string
 type: 'Bank Transfer' | 'MCB Juice' | 'Credit Card'
 details: string
 isPrimary: boolean
}

export interface NotificationSettings {
 newClaims: boolean
 employeeAdditions: boolean
 billingUpdates: boolean
 policyRenewals: boolean
 employeeNotifications: boolean
 customAlerts: boolean
}

export interface BillingHistory {
 id: string
 date: string
 description: string
 amount: number
 status: 'paid' | 'pending' | 'overdue'
 invoice?: string
}

export type ActiveTab = 'profile' | 'employees' | 'billing' | 'notifications'