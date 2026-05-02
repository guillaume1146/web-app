'use client'

import { useState, useEffect, useCallback } from 'react'
import { CorporateStats, Employee, ClaimsData } from '../types'
import { useUser } from '@/hooks/useUser'
import DashboardOverview from './DashboardOverview'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'
import CreateCompanyBanner from '@/components/corporate/CreateCompanyBanner'
import LegacyMigrationBanner from '@/components/shared/LegacyMigrationBanner'

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

 const fetchDashboard = useCallback(async () => {
  if (!userId) return
  setLoading(true)
  try {
   const res = await fetch(`/api/corporate/${userId}/dashboard`, { credentials: 'include' })
   if (res.ok) {
    const json = await res.json()
    if (json.success) {
     const apiData = json.data
     const apiStats = apiData.stats || {}
     setCorporateData(prev => ({
      ...prev,
      stats: {
       totalEmployees: apiStats.employeeCount || 0,
       activePolicyHolders: apiStats.activeEmployees || 0,
       pendingVerifications: (apiStats.employeeCount || 0) - (apiStats.activeEmployees || 0),
       approvedClaims: 0,
       pendingClaims: 0,
       rejectedClaims: 0,
       monthlyContribution: apiStats.totalSpent || 0,
       totalClaims: 0,
      },
     }))
    }
   }
  } catch (error) {
   console.error('Failed to fetch corporate dashboard:', error)
  } finally {
   setLoading(false)
  }
 }, [userId])

 useEffect(() => {
  fetchDashboard()
 }, [fetchDashboard])

 if (loading && !userId) {
  return (
   <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
   </div>
  )
 }

 return (
  <>
   <LegacyMigrationBanner
    feature="corporate"
    newHref="/patient/my-company"
    newLabel="Go to My Company"
   />

   {userId && <CreateCompanyBanner userId={userId} onCreated={fetchDashboard} />}
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
