'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FaDollarSign,
  FaUsers,
  FaChartLine,
  FaTrophy,
  FaSpinner
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { ReferralPartnerData } from '../types'
import StatCard from './StatCard'
import UTMLinkGenerator from './UTMLinkGenerator'
import LeadPerformance from './LeadPerformance'
import RecentConversions from './RecentConversions'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'

function computeNextPayoutDate(): string {
  const now = new Date()
  const day = now.getDate()
  let payoutDate: Date

  if (day < 15) {
    // Next payout is the 15th of this month
    payoutDate = new Date(now.getFullYear(), now.getMonth(), 15)
  } else {
    // Next payout is the 1st of next month
    payoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }

  return payoutDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ReferralPartnerDashboard() {
  const [partnerData, setPartnerData] = useState<ReferralPartnerData>({
    name: '', email: '', avatar: '', memberSince: '', partnerLevel: 'Bronze', promoCode: '',
    stats: { totalEarnings: 0, totalReferrals: 0, conversionRate: 0, thisMonthEarnings: 0, thisMonthReferrals: 0, pendingPayouts: 0 },
    earnings: { totalRevenue: 0, paidOut: 0, pending: 0, nextPayoutDate: computeNextPayoutDate() },
    leadsBySource: [],
    recentConversions: [],
  })
  const { user: currentUser } = useUser()
  const userId = currentUser?.id ?? ''
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/referral-partners/${userId}/dashboard`)
        if (res.ok) {
          const json = await res.json()
          if (json.success) {
            const { stats, recentConversions: conversions = [], leadsBySource: apiLeads } = json.data

            // Map leadsBySource from API into LeadSourceData[] format
            const mappedLeads: typeof partnerData.leadsBySource = []
            if (apiLeads && Array.isArray(apiLeads)) {
              // If API returns array format (new tracking data)
              mappedLeads.push(...apiLeads)
            } else if (apiLeads && typeof apiLeads === 'object') {
              // Legacy format: { direct: N, social: 0, ... }
              for (const [source, visitors] of Object.entries(apiLeads)) {
                if (typeof visitors === 'number' && visitors > 0) {
                  mappedLeads.push({
                    source: source.charAt(0).toUpperCase() + source.slice(1),
                    visitors,
                    conversions: 0,
                    conversionRate: 0,
                    earnings: 0,
                    utmLink: '',
                  })
                }
              }
            }

            setPartnerData(prev => ({
              ...prev,
              promoCode: stats.referralCode || prev.promoCode,
              stats: {
                totalEarnings: stats.totalEarnings ?? 0,
                totalReferrals: stats.totalReferrals ?? 0,
                conversionRate: stats.totalReferrals > 0
                  ? Math.round((conversions.length / stats.totalReferrals) * 100)
                  : 0,
                thisMonthEarnings: stats.thisMonthEarnings ?? 0,
                thisMonthReferrals: stats.thisMonthReferrals ?? 0,
                pendingPayouts: stats.pendingPayouts ?? 0,
              },
              earnings: {
                totalRevenue: stats.totalEarnings ?? 0,
                paidOut: (stats.totalEarnings ?? 0) - (stats.pendingPayouts ?? 0),
                pending: stats.pendingPayouts ?? 0,
                nextPayoutDate: prev.earnings.nextPayoutDate || computeNextPayoutDate(),
              },
              leadsBySource: mappedLeads,
              recentConversions: conversions.map((c: { id: string; firstName: string; lastName: string; userType: string; createdAt: string }) => ({
                id: c.id,
                customerName: `${c.firstName} ${c.lastName}`,
                planType: c.userType,
                conversionDate: c.createdAt,
                commission: 100, // Rs 100 signup bonus per referral
                status: 'completed' as const,
              })),
            }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch referral partner dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [userId])

  return (
    <>
      {userId && (
        <div className="mb-8">
          <WalletBalanceCard userId={userId} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={FaDollarSign}
          title="Total Earnings"
          value={loading ? '...' : `Rs ${partnerData.stats.totalEarnings.toLocaleString()}`}
          subtitle="Lifetime commission"
          color="bg-green-500"
          trend={0}
        />
        <StatCard
          icon={FaUsers}
          title="Total Referrals"
          value={partnerData.stats.totalReferrals}
          subtitle="People referred"
          color="bg-blue-500"
          trend={0}
        />
        <StatCard
          icon={FaChartLine}
          title="Conversion Rate"
          value={`${partnerData.stats.conversionRate}%`}
          subtitle="Visitors to customers"
          color="bg-purple-500"
          trend={0}
        />
        <StatCard
          icon={FaDollarSign}
          title="This Month"
          value={loading ? '...' : `Rs ${partnerData.stats.thisMonthEarnings.toLocaleString()}`}
          subtitle={`${partnerData.stats.thisMonthReferrals} new referrals`}
          color="bg-orange-500"
          trend={0}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <UTMLinkGenerator promoCode={partnerData.promoCode} />
          <LeadPerformance leadsBySource={partnerData.leadsBySource} />
        </div>

        <div className="space-y-8">
          <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-2">Your Promo Code</h3>
            <div className="bg-white/20 rounded-lg p-3 mb-4">
              <p className="text-2xl font-bold font-mono">{partnerData.promoCode}</p>
            </div>
            <p className="text-white/90 text-sm mb-4">
              Share this code with potential customers to earn commissions
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(partnerData.promoCode)}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition w-full"
            >
              Copy Code
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Earnings Summary</h3>
              <Link href="/referral-partner/billing" className="text-purple-600 text-sm hover:underline">
                View Details
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-medium">Rs {partnerData.earnings.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Paid Out</span>
                <span className="font-medium text-green-600">Rs {partnerData.earnings.paidOut.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-orange-600">Rs {partnerData.earnings.pending.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 mt-3 flex justify-between">
                <span className="font-bold">Next Payout</span>
                <span className="font-bold text-purple-600">{partnerData.earnings.nextPayoutDate}</span>
              </div>
            </div>
          </div>

          <RecentConversions conversions={partnerData.recentConversions} />

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-yellow-800 mb-2 flex items-center gap-2">
              <FaTrophy />
              Partner Level Progress
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-yellow-700">Current: {partnerData.partnerLevel}</span>
                <span className="text-yellow-700">
                  {partnerData.partnerLevel === 'Diamond' ? 'Max Level!' : 'Next: Diamond'}
                </span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: partnerData.partnerLevel === 'Gold' ? '75%' : '100%' }}
                />
              </div>
            </div>
            <div className="text-yellow-700 text-sm">
              <p className="mb-2">Benefits at {partnerData.partnerLevel} level:</p>
              <ul className="space-y-1 text-xs">
                <li>&bull; Up to 25% commission rate</li>
                <li>&bull; Priority support</li>
                <li>&bull; Marketing materials</li>
                <li>&bull; Monthly performance calls</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
