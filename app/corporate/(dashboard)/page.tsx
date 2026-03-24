'use client'

import { useState, useEffect } from 'react'
import { CorporateStats, Employee, ClaimsData } from '../types'
import { useUser } from '@/hooks/useUser'
import DashboardOverview from './DashboardOverview'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'

const emptyStats: CorporateStats = {
 totalEmployees: 0,
 activePolicyHolders: 0,
 pendingVerifications: 0,
 approvedClaims: 0,
 pendingClaims: 0,
 rejectedClaims: 0,
 monthlyContribution: 0,
 totalClaims: 0,
}

export default function CorporateDashboard() {
 const [corporateData, setCorporateData] = useState({
 stats: emptyStats,
 employees: [] as Employee[],
 claims: [] as ClaimsData[],
 })
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 if (!userId) return

 const fetchDashboard = async () => {
 setLoading(true)
 try {
 const res = await fetch(`/api/corporate/${userId}/dashboard`)
 if (res.ok) {
 const json = await res.json()
 if (json.success) {
 const apiData = json.data
 setCorporateData(prev => ({
 ...prev,
 stats: {
 totalEmployees: apiData.stats.totalEmployees || 0,
 activePolicyHolders: apiData.stats.activePolicyHolders || 0,
 pendingVerifications: prev.stats.pendingVerifications,
 approvedClaims: apiData.stats.approvedClaims || 0,
 pendingClaims: apiData.stats.pendingClaims || 0,
 rejectedClaims: apiData.stats.rejectedClaims || 0,
 monthlyContribution: apiData.stats.monthlyContribution || 0,
 totalClaims: apiData.stats.totalClaims || 0,
 },
 }))
 }
 }
 } catch (error) {
 console.error('Failed to fetch corporate dashboard:', error)
 } finally {
 setLoading(false)
 }
 }

 fetchDashboard()
 }, [userId])

 if (loading && !userId) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
 </div>
 )
 }

 return (
 <>
 {userId && (
 <div className="mb-8">
 <WalletBalanceCard userId={userId} />
 </div>
 )}

 <DashboardOverview
 stats={corporateData.stats}
 recentEmployees={corporateData.employees}
 recentClaims={corporateData.claims}
 />
 </>
 )
}
