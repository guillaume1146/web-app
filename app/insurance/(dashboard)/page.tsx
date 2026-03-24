'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
 FaShieldAlt, FaClock, FaDollarSign, FaUsers,
 FaExclamationTriangle, FaChartLine
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { InsuranceDashboardData, InsuranceClaim } from './types'
import StatCard from './StatCard'
import ClaimsTable from './ClaimsTable'
import PolicyHoldersTable from './PolicyHoldersTable'
import EarningsSidebar from './EarningsSidebar'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'

const emptyDashboard: InsuranceDashboardData = {
 name: '',
 location: '',
 avatar: '',
 companyName: '',
 stats: {
 activePolicies: 0,
 pendingClaims: 0,
 monthlyCommission: 0,
 policyHolders: 0,
 expiringPolicies: 0,
 claimApprovalRate: 0,
 },
 recentClaims: [],
 policyHolders: [],
 earnings: {
 totalCommission: 0,
 platformFee: 0,
 netPayout: 0,
 },
}

export default function InsuranceDashboardPage() {
 const [insuranceData, setInsuranceData] = useState<InsuranceDashboardData>(emptyDashboard)
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [loading, setLoading] = useState(true)
 const [claimError, setClaimError] = useState<string | null>(null)

 const fetchDashboard = useCallback(async () => {
 if (!userId) return
 try {
 const [dashRes, claimsRes] = await Promise.all([
 fetch(`/api/insurance/${userId}/dashboard`),
 fetch('/api/insurance/claims?status=pending&limit=5'),
 ])

 if (dashRes.ok) {
 const json = await dashRes.json()
 if (json.success) {
 const apiData = json.data
 // Map plans to policy holders for display
 const policyHolders = (apiData.plans || []).map((plan: { id: string; planName: string; planType: string; premium: number; coverageAmount: number; isActive: boolean }) => ({
 id: plan.id,
 name: plan.planName,
 email: '',
 phone: '',
 policyNumber: `POL-${plan.id.slice(0, 8).toUpperCase()}`,
 policyType: plan.planType,
 premium: plan.premium,
 status: plan.isActive ? 'active' as const : 'expired' as const,
 expiryDate: '',
 coverageAmount: plan.coverageAmount,
 }))

 const activePlans = policyHolders.filter((p: { status: string }) => p.status === 'active').length

 let recentClaims: InsuranceDashboardData['recentClaims'] = []
 let pendingClaimsCount = 0

 if (claimsRes.ok) {
 const claimsJson = await claimsRes.json()
 if (claimsJson.success) {
 pendingClaimsCount = claimsJson.pagination?.total ?? claimsJson.data?.length ?? 0
 recentClaims = (claimsJson.data || []).map((c: {
 id: string
 claimId: string
 policyHolderName: string
 policyType: string
 claimAmount: number
 status: string
 submittedDate: string
 description?: string
 }) => ({
 id: c.id,
 claimId: c.claimId,
 policyHolderName: c.policyHolderName,
 policyType: c.policyType,
 claimAmount: c.claimAmount,
 status: c.status as InsuranceClaim['status'],
 submittedDate: c.submittedDate,
 description: c.description ?? '',
 }))
 }
 }

 setInsuranceData(prev => ({
 ...prev,
 stats: {
 ...prev.stats,
 activePolicies: apiData.stats?.activePolicies || activePlans,
 policyHolders: apiData.stats?.totalPlans || policyHolders.length,
 pendingClaims: pendingClaimsCount,
 monthlyCommission: apiData.stats?.monthlyCommission || 0,
 expiringPolicies: apiData.stats?.expiringPolicies || 0,
 claimApprovalRate: apiData.stats?.claimApprovalRate || 0,
 },
 policyHolders,
 recentClaims,
 }))
 }
 }
 } catch (error) {
 console.error('Failed to fetch insurance dashboard:', error)
 } finally {
 setLoading(false)
 }
 }, [userId])

 useEffect(() => {
 fetchDashboard()
 }, [fetchDashboard])

 const handleUpdateClaim = async (claimId: string, status: string) => {
 const action = status === 'approved' ? 'approve' : 'reject'
 setClaimError(null)
 try {
 const res = await fetch(`/api/insurance/claims/${claimId}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action }),
 })
 if (res.ok) {
 fetchDashboard()
 } else {
 const json = await res.json().catch(() => ({}))
 setClaimError(json.message || 'Failed to update claim. Please try again.')
 }
 } catch {
 setClaimError('Failed to update claim. Please check your connection and try again.')
 }
 }

 const handleEditPolicyHolder = (policyHolderId: string) => {
 window.location.href = `/insurance/plans?edit=${policyHolderId}`
 }

 const handleDeletePolicyHolder = async (policyHolderId: string) => {
 if (!confirm('Are you sure you want to delete this plan?')) return
 try {
 const res = await fetch(`/api/insurance/plans/${policyHolderId}`, { method: 'DELETE' })
 if (res.ok) {
 fetchDashboard() // Refresh data
 }
 } catch (error) {
 console.error('Failed to delete plan:', error)
 }
 }

 const handleViewPolicyHolder = (policyHolderId: string) => {
 window.location.href = `/insurance/plans?view=${policyHolderId}`
 }

 const handleAddPolicyHolder = () => {
 window.location.href = '/insurance/plans?add=true'
 }

 return (
 <>
 {userId && (
 <div className="mb-8">
 <WalletBalanceCard userId={userId} />
 </div>
 )}

 {claimError && (
 <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
 <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
 <div className="flex-1">
 <p className="text-red-700 text-sm font-medium">{claimError}</p>
 </div>
 <button
 onClick={() => setClaimError(null)}
 className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0"
 aria-label="Dismiss error"
 >
 &times;
 </button>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <StatCard
 icon={FaShieldAlt}
 title="Active Policies"
 value={loading ? '...' : insuranceData.stats.activePolicies}
 color="bg-blue-500"
 subtitle={`${insuranceData.stats.policyHolders} total plans`}
 />
 <StatCard
 icon={FaClock}
 title="Pending Claims"
 value={loading ? '...' : insuranceData.stats.pendingClaims}
 color="bg-yellow-500"
 subtitle="Awaiting review"
 />
 <StatCard
 icon={FaDollarSign}
 title="Monthly Commission"
 value={loading ? '...' : `Rs ${insuranceData.stats.monthlyCommission.toLocaleString()}`}
 color="bg-green-500"
 subtitle="This month"
 />
 <StatCard
 icon={FaUsers}
 title="Policy Holders"
 value={loading ? '...' : insuranceData.stats.policyHolders}
 color="bg-purple-500"
 subtitle={insuranceData.stats.expiringPolicies > 0 ? `${insuranceData.stats.expiringPolicies} expiring soon` : 'All up to date'}
 />
 </div>

 {insuranceData.stats.expiringPolicies > 0 && (
 <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-8 rounded-lg">
 <div className="flex items-center">
 <div className="flex-shrink-0">
 <FaExclamationTriangle className="h-5 w-5 text-orange-400" />
 </div>
 <div className="ml-3">
 <p className="text-sm text-orange-700">
 <strong>Action Required:</strong> {insuranceData.stats.expiringPolicies} policies are expiring within 30 days.
 <Link href="/insurance/clients" className="font-medium underline hover:text-orange-800 ml-1">
 Review and renew policies
 </Link>
 </p>
 </div>
 </div>
 </div>
 )}

 <div className="grid lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <ClaimsTable
 claims={insuranceData.recentClaims}
 onUpdateClaim={handleUpdateClaim}
 />
 <PolicyHoldersTable
 policyHolders={insuranceData.policyHolders}
 onEdit={handleEditPolicyHolder}
 onDelete={handleDeletePolicyHolder}
 onView={handleViewPolicyHolder}
 onAdd={handleAddPolicyHolder}
 />
 </div>

 <div className="space-y-8">
 <EarningsSidebar
 totalCommission={insuranceData.earnings.totalCommission}
 platformFee={insuranceData.earnings.platformFee}
 netPayout={insuranceData.earnings.netPayout}
 claimApprovalRate={insuranceData.stats.claimApprovalRate}
 expiringPolicies={insuranceData.stats.expiringPolicies}
 />
 </div>
 </div>

 <div className="mt-12 bg-white rounded-2xl p-6 shadow-lg">
 <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <Link
 href="/insurance/clients"
 className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition group"
 >
 <FaUsers className="text-2xl text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
 <p className="text-sm font-medium">Add Policy Holder</p>
 </Link>
 <Link
 href="/insurance/claims"
 className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-green-500 hover:bg-green-50 transition group"
 >
 <FaClock className="text-2xl text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
 <p className="text-sm font-medium">Process Claims</p>
 </Link>
 <Link
 href="/insurance/clients"
 className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-purple-500 hover:bg-purple-50 transition group"
 >
 <FaShieldAlt className="text-2xl text-purple-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
 <p className="text-sm font-medium">Policy Renewals</p>
 </Link>
 <Link
 href="/insurance/billing"
 className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-orange-500 hover:bg-orange-50 transition group"
 >
 <FaChartLine className="text-2xl text-orange-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
 <p className="text-sm font-medium">View Billing</p>
 </Link>
 </div>
 </div>
 </>
 )
}
