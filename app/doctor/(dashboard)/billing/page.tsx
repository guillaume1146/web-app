'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaSpinner } from 'react-icons/fa'
import { useDoctorData } from '../context'
import BillingEarnings from '../components/BillingEarnings'
import SubscriptionTab from '@/components/settings/tabs/SubscriptionTab'

interface WalletTransaction {
 id: string
 description?: string
 createdAt: string
 amount: number
 type: string
 serviceType?: string
 status?: string
}

type TransactionType = 'consultation' | 'video_consultation' | 'procedure' | 'emergency'
type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded'
type PaymentMethod = 'cash' | 'card' | 'insurance' | 'mcb_juice'

interface BillingTransaction {
 id: string
 patientName: string
 date: string
 time: string
 amount: number
 type: TransactionType
 paymentMethod: PaymentMethod
 status: TransactionStatus
}

interface BillingPageData {
 billing: {
 earnings: {
 today?: number
 thisWeek?: number
 thisMonth?: number
 thisYear?: number
 totalEarnings?: number
 pendingPayouts?: number
 averageConsultationFee?: number
 }
 transactions: BillingTransaction[]
 receiveMethods: never[]
 bankAccounts: never[]
 }
 [key: string]: unknown
}

export default function BillingPage() {
 const user = useDoctorData()
 const [billingData, setBillingData] = useState<BillingPageData | null>(null)
 const [loading, setLoading] = useState(true)

 const fetchBilling = useCallback(async () => {
 try {
 const res = await fetch(`/api/users/${user.id}/wallet`)
 const json = await res.json()

 if (json.success && json.data) {
 const txs: WalletTransaction[] = json.data.transactions || []

 // Transform wallet transactions to billing format
 const transactions: BillingTransaction[] = txs.map((tx) => ({
 id: tx.id,
 patientName: tx.description || 'Transaction',
 date: tx.createdAt,
 time: new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
 amount: tx.amount,
 type: (tx.serviceType || 'consultation') as TransactionType,
 paymentMethod: 'cash' as PaymentMethod,
 status: (tx.status || 'completed') as TransactionStatus,
 }))

 // Calculate earnings from credit transactions
 const now = new Date()
 const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
 const weekStart = new Date(todayStart)
 weekStart.setDate(weekStart.getDate() - weekStart.getDay())
 const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
 const yearStart = new Date(now.getFullYear(), 0, 1)

 const credits = txs.filter((tx) => tx.type === 'credit')
 const sumAfter = (date: Date) =>
 credits
 .filter((tx) => new Date(tx.createdAt) >= date)
 .reduce((s: number, tx) => s + tx.amount, 0)

 setBillingData({
 billing: {
 earnings: {
 today: sumAfter(todayStart),
 thisWeek: sumAfter(weekStart),
 thisMonth: sumAfter(monthStart),
 thisYear: sumAfter(yearStart),
 totalEarnings: credits.reduce((s: number, tx) => s + tx.amount, 0),
 pendingPayouts: 0,
 averageConsultationFee: credits.length > 0
 ? Math.round(credits.reduce((s: number, tx) => s + tx.amount, 0) / credits.length)
 : 0,
 },
 transactions,
 receiveMethods: [],
 bankAccounts: [],
 },
 })
 } else {
 setBillingData({ billing: { earnings: {}, transactions: [], receiveMethods: [], bankAccounts: [] } })
 }
 } catch (error) {
 console.error('Failed to fetch billing:', error)
 setBillingData({ billing: { earnings: {}, transactions: [], receiveMethods: [], bankAccounts: [] } })
 } finally {
 setLoading(false)
 }
 }, [user.id])

 useEffect(() => {
 fetchBilling()
 }, [fetchBilling])

 if (loading || !billingData) {
 return (
 <div className="flex items-center justify-center py-20">
 <FaSpinner className="animate-spin text-3xl text-blue-600" />
 </div>
 )
 }

 return (
 <div className="space-y-6">
 {/* Subscription Plan */}
 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
 <SubscriptionTab userId={user.id} />
 </div>
 {/* Earnings */}
 <BillingEarnings doctorData={billingData} />
 </div>
 )
}
