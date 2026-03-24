'use client'

import React, { useState } from 'react'
import type { IconType } from 'react-icons'
import {
 FaMoneyBillWave,
 FaDollarSign,
 FaChartLine,
 FaCreditCard,
 FaUniversity,
 FaFileInvoice,
 FaReceipt,
 FaSearch,
 FaFilter,
 FaDownload,
 FaCalendarAlt,
 FaClock,
 FaCheckCircle,
 FaChevronDown,
 FaChevronUp,
 FaWallet,
 FaCoins,
 FaPercentage,
 FaArrowUp,
 FaArrowDown,
 FaHistory,
 FaPlus,
 FaEdit,
 FaEye,
 FaChartPie,
 FaChartBar,
 FaTimes,
 FaHourglass
} from 'react-icons/fa'

/* ---------------- Types ---------------- */

type TransactionType = 'consultation' | 'video_consultation' | 'procedure' | 'emergency'
type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded'
type PaymentMethod = 'cash' | 'card' | 'insurance' | 'mcb_juice'

interface Earnings {
 today?: number
 thisWeek?: number
 thisMonth?: number
 thisYear?: number
 totalEarnings?: number
 pendingPayouts?: number
 averageConsultationFee?: number
}

interface Transaction {
 id: string
 patientName: string
 date: string // ISO or date-like string
 time: string
 amount: number
 type: TransactionType
 paymentMethod: PaymentMethod
 status: TransactionStatus
 invoiceUrl?: string
 receiptUrl?: string
}

interface ReceiveMethod {
 id: string
 type: 'credit_card' | 'mcb_juice' | 'bank_transfer'
 cardNumber?: string
 cardHolder?: string
 accountHolder?: string
 expiryDate?: string
 isDefault?: boolean
}

interface BankAccount {
 id: string
 bankName: string
 accountNumber: string
 swift: string
 iban?: string
 isDefault?: boolean
}

interface Billing {
 earnings?: Earnings
 transactions?: Transaction[]
 receiveMethods?: ReceiveMethod[]
 bankAccounts?: BankAccount[]
 taxRate?: number
 taxId?: string
}

interface DoctorData {
 billing?: Billing
 // allow extra shape without widening to any
 [key: string]: unknown
}

interface Props {
 doctorData: DoctorData
}

interface FilterOptions {
 type: 'all' | TransactionType
 status: 'all' | TransactionStatus
 paymentMethod: 'all' | PaymentMethod
 dateRange: 'all' | 'today' | 'week' | 'month' | 'year'
}

/* ---------------- Component ---------------- */

const BillingEarnings: React.FC<Props> = ({ doctorData }) => {
 const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payments' | 'analytics'>('overview')
 const [searchQuery, setSearchQuery] = useState('')
 const [filters, setFilters] = useState<FilterOptions>({
 type: 'all',
 status: 'all',
 paymentMethod: 'all',
 dateRange: 'all'
 })
 const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null)
 const [showFilters, setShowFilters] = useState(false)
 const [showAddPayment, setShowAddPayment] = useState(false)
 const [showAddBank, setShowAddBank] = useState(false)

 // Get billing data from doctorData (with safe defaults)
 const billing: Billing = doctorData?.billing ?? {}
 const earnings: Earnings = billing.earnings ?? {}
 const transactions: Transaction[] = billing.transactions ?? []
 const receiveMethods: ReceiveMethod[] = billing.receiveMethods ?? []
 const bankAccounts: BankAccount[] = billing.bankAccounts ?? []
 const taxRate: number = billing.taxRate ?? 15

 // Calculate additional metrics
 const calculateGrowth = (current: number, previous: number): number => {
 if (!previous) return 0
 return ((current - previous) / previous) * 100
 }

 const getTodayGrowth = (): number => {
 const todayVal = earnings.today ?? 0
 const weekVal = earnings.thisWeek ?? 0
 const yesterday = weekVal ? (weekVal - todayVal) / 6 : 0
 return calculateGrowth(todayVal, yesterday)
 }

 // Filter transactions
 const filterTransactions = (transactionList: Transaction[]): Transaction[] => {
 const q = searchQuery.toLowerCase()
 return transactionList.filter((transaction) => {
 const matchesSearch =
 (transaction.patientName ?? '').toLowerCase().includes(q) ||
 (transaction.id ?? '').toLowerCase().includes(q)

 const matchesType = filters.type === 'all' || transaction.type === filters.type
 const matchesStatus = filters.status === 'all' || transaction.status === filters.status
 const matchesPayment =
 filters.paymentMethod === 'all' || transaction.paymentMethod === filters.paymentMethod

 // Note: dateRange filter UI exists but not implemented here; add if needed.
 return matchesSearch && matchesType && matchesStatus && matchesPayment
 })
 }

 const sections: {
 id: 'overview' | 'transactions' | 'payments' | 'analytics'
 label: string
 icon: IconType
 color: 'green' | 'blue' | 'purple' | 'orange'
 count?: number
 }[] = [
 { id: 'overview', label: 'Earnings Overview', icon: FaChartLine, color: 'green' },
 { id: 'transactions', label: 'Transactions', icon: FaFileInvoice, color: 'blue', count: transactions.length },
 { id: 'payments', label: 'Payment Methods', icon: FaCreditCard, color: 'purple', count: receiveMethods.length },
 { id: 'analytics', label: 'Analytics', icon: FaChartPie, color: 'orange' }
 ]

 const getStatusColor = (status: TransactionStatus | string) => {
 switch (status) {
 case 'completed':
 return 'bg-sky-50 text-green-800 border-green-200'
 case 'pending':
 return 'bg-sky-50 text-yellow-800 border-yellow-200'
 case 'failed':
 return 'bg-sky-50 text-red-800 border-red-200'
 case 'refunded':
 return 'bg-sky-50 text-purple-800 border-purple-200'
 default:
 return 'bg-sky-50 text-gray-800 border-gray-200'
 }
 }

 const getPaymentMethodIcon = (method: PaymentMethod | string) => {
 switch (method) {
 case 'cash':
 return <FaMoneyBillWave className="text-green-500" />
 case 'card':
 return <FaCreditCard className="text-blue-500" />
 case 'insurance':
 return <FaFileInvoice className="text-purple-500" />
 case 'mcb_juice':
 return <FaWallet className="text-orange-500" />
 default:
 return <FaCoins className="text-gray-500" />
 }
 }

 const renderEarningsOverview = () => {
 const today = earnings.today ?? 0
 const week = earnings.thisWeek ?? 0
 const month = earnings.thisMonth ?? 0
 const year = earnings.thisYear ?? 0
 const total = earnings.totalEarnings ?? 0
 const pending = earnings.pendingPayouts ?? 0
 const avg = earnings.averageConsultationFee ?? 0
 const todayGrowth = getTodayGrowth()

 return (
 <div className="space-y-4 sm:space-y-6">
 {/* Earnings Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-green-200">
 <div className="flex items-center justify-between mb-2">
 <p className="text-xs sm:text-sm text-gray-600">Today</p>
 <FaDollarSign className="text-green-500" />
 </div>
 <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">Rs {today.toLocaleString()}</p>
 <div className="flex items-center gap-1 mt-1">
 {todayGrowth > 0 ? <FaArrowUp className="text-green-500 text-xs" /> : <FaArrowDown className="text-red-500 text-xs" />}
 <span className={`text-xs ${todayGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
 {todayGrowth.toFixed(1)}%
 </span>
 </div>
 </div>

 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
 <div className="flex items-center justify-between mb-2">
 <p className="text-xs sm:text-sm text-gray-600">This Week</p>
 <FaCalendarAlt className="text-blue-500" />
 </div>
 <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700">Rs {week.toLocaleString()}</p>
 <p className="text-xs text-gray-500 mt-1">Avg: Rs {((week || 0) / 7).toFixed(0)}/day</p>
 </div>

 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-200">
 <div className="flex items-center justify-between mb-2">
 <p className="text-xs sm:text-sm text-gray-600">This Month</p>
 <FaChartBar className="text-purple-500" />
 </div>
 <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-700">Rs {month.toLocaleString()}</p>
 <p className="text-xs text-gray-500 mt-1">Target: Rs 200,000</p>
 </div>

 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-orange-200">
 <div className="flex items-center justify-between mb-2">
 <p className="text-xs sm:text-sm text-gray-600">This Year</p>
 <FaChartLine className="text-orange-500" />
 </div>
 <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-700">Rs {year.toLocaleString()}</p>
 <p className="text-xs text-gray-500 mt-1">Total: Rs {total.toLocaleString()}</p>
 </div>
 </div>

 {/* Additional Metrics */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
 <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 border border-cyan-200">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending Payouts</p>
 <p className="text-xl sm:text-2xl font-bold text-cyan-700">Rs {pending.toLocaleString()}</p>
 <button className="text-xs text-cyan-600 hover:underline mt-2">View Details →</button>
 </div>
 <div className="p-3 bg-cyan-100 rounded-lg">
 <FaHourglass className="text-cyan-600 text-xl" />
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 border border-emerald-200">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs sm:text-sm text-gray-600 mb-1">Average Consultation</p>
 <p className="text-xl sm:text-2xl font-bold text-emerald-700">Rs {avg.toLocaleString()}</p>
 <p className="text-xs text-gray-500 mt-2">Per appointment</p>
 </div>
 <div className="p-3 bg-emerald-100 rounded-lg">
 <FaCoins className="text-emerald-600 text-xl" />
 </div>
 </div>
 </div>

 <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 border border-red-200">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs sm:text-sm text-gray-600 mb-1">Tax Rate</p>
 <p className="text-xl sm:text-2xl font-bold text-red-700">{taxRate}%</p>
 <p className="text-xs text-gray-500 mt-2">Tax ID: {billing.taxId || 'N/A'}</p>
 </div>
 <div className="p-3 bg-red-100 rounded-lg">
 <FaPercentage className="text-red-600 text-xl" />
 </div>
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 border border-gray-200">
 <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3">Quick Actions</h3>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
 <button className="p-3 bg-white transition flex flex-col items-center gap-1 text-xs sm:text-sm">
 <FaFileInvoice className="text-lg" />
 Generate Invoice
 </button>
 <button className="p-3 bg-white transition flex flex-col items-center gap-1 text-xs sm:text-sm">
 <FaDownload className="text-lg" />
 Export Report
 </button>
 <button className="p-3 bg-white transition flex flex-col items-center gap-1 text-xs sm:text-sm">
 <FaReceipt className="text-lg" />
 View Receipts
 </button>
 <button className="p-3 bg-white transition flex flex-col items-center gap-1 text-xs sm:text-sm">
 <FaChartPie className="text-lg" />
 Analytics
 </button>
 </div>
 </div>
 </div>
 )
 }

 const renderTransactionCard = (transaction: Transaction) => (
 <div
 key={transaction.id}
 className="bg-white/30 rounded-lg sm:rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
 >
 <div className="p-3 sm:p-4 md:p-5">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <div className="flex items-start gap-3">
 <div className="p-2 bg-sky-50 rounded-lg">
 {getPaymentMethodIcon(transaction.paymentMethod)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{transaction.patientName}</h4>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
 {transaction.status === 'completed' && <FaCheckCircle className="inline mr-1" />}
 {transaction.status === 'pending' && <FaClock className="inline mr-1" />}
 {transaction.status === 'failed' && <FaTimes className="inline mr-1" />}
 {transaction.status}
 </span>
 </div>
 <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600">
 <span>{new Date(transaction.date).toLocaleDateString()} at {transaction.time}</span>
 <span className="font-medium">Rs {transaction.amount?.toLocaleString()}</span>
 <span>{transaction.type}</span>
 </div>
 </div>
 </div>

 <div className="flex gap-2 self-end sm:self-auto">
 <button
 onClick={() => setExpandedTransaction(expandedTransaction === transaction.id ? null : transaction.id)}
 className="px-3 py-1.5 bg-white transition"
 >
 <FaEye className="inline mr-1" />
 View
 </button>
 {transaction.invoiceUrl && (
 <button className="px-3 py-1.5 bg-white transition">
 <FaDownload className="inline mr-1" />
 Invoice
 </button>
 )}
 </div>
 </div>

 {expandedTransaction === transaction.id && (
 <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
 <div>
 <p className="text-gray-500">Transaction ID</p>
 <p className="font-medium">{transaction.id}</p>
 </div>
 <div>
 <p className="text-gray-500">Type</p>
 <p className="font-medium">{transaction.type}</p>
 </div>
 <div>
 <p className="text-gray-500">Payment Method</p>
 <p className="font-medium">{transaction.paymentMethod}</p>
 </div>
 <div>
 <p className="text-gray-500">Amount</p>
 <p className="font-medium">Rs {transaction.amount?.toLocaleString()}</p>
 </div>
 </div>
 {transaction.receiptUrl && (
 <button className="mt-2 text-blue-600 hover:underline text-xs sm:text-sm">View Receipt →</button>
 )}
 </div>
 )}
 </div>
 </div>
 )

 const renderPaymentMethods = () => (
 <div className="space-y-4">
 {/* Payment Methods */}
 <div className="space-y-3">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm sm:text-base font-semibold text-gray-800">Payment Methods</h3>
 <button
 onClick={() => setShowAddPayment(!showAddPayment)}
 className="px-3 py-1.5 bg-white transition"
 >
 <FaPlus className="inline mr-1" />
 Add Method
 </button>
 </div>

 {showAddPayment && (
 <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
 <form className="space-y-3">
 <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
 <option>Credit Card</option>
 <option>MCB Juice</option>
 <option>Bank Transfer</option>
 </select>
 <input type="text" placeholder="Card Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
 <div className="flex gap-2">
 <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">Save</button>
 <button type="button" onClick={() => setShowAddPayment(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm">Cancel</button>
 </div>
 </form>
 </div>
 )}

 {receiveMethods.map((method) => (
 <div key={method.id} className="bg-white rounded-lg p-4 border border-purple-200">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-purple-100 rounded-lg">
 {method.type === 'credit_card' && <FaCreditCard className="text-purple-600 text-lg" />}
 {method.type === 'mcb_juice' && <FaWallet className="text-purple-600 text-lg" />}
 {method.type === 'bank_transfer' && <FaUniversity className="text-purple-600 text-lg" />}
 </div>
 <div>
 <p className="font-medium text-gray-800 text-sm sm:text-base">
 {method.type === 'credit_card' ? 'Credit Card' : method.type === 'mcb_juice' ? 'MCB Juice' : 'Bank Transfer'}
 </p>
 <p className="text-xs sm:text-sm text-gray-600">
 {method.cardNumber || 'Account'} • {method.cardHolder || method.accountHolder}
 </p>
 {method.expiryDate && <p className="text-xs text-gray-500">Expires: {method.expiryDate}</p>}
 </div>
 </div>
 <div className="flex items-center gap-2">
 {method.isDefault && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Default</span>}
 <button className="text-purple-600 hover:text-purple-800">
 <FaEdit />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Bank Accounts */}
 <div className="space-y-3 mt-6">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm sm:text-base font-semibold text-gray-800">Bank Accounts</h3>
 <button
 onClick={() => setShowAddBank(!showAddBank)}
 className="px-3 py-1.5 bg-white transition"
 >
 <FaPlus className="inline mr-1" />
 Add Bank
 </button>
 </div>

 {showAddBank && (
 <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
 <form className="space-y-3">
 <input type="text" placeholder="Bank Name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
 <input type="text" placeholder="Account Number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
 <input type="text" placeholder="SWIFT Code" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
 <div className="flex gap-2">
 <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">Save</button>
 <button type="button" onClick={() => setShowAddBank(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm">Cancel</button>
 </div>
 </form>
 </div>
 )}

 {bankAccounts.map((account) => (
 <div key={account.id} className="bg-white rounded-lg p-4 border border-green-200">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-green-100 rounded-lg">
 <FaUniversity className="text-green-600 text-lg" />
 </div>
 <div>
 <p className="font-medium text-gray-800 text-sm sm:text-base">{account.bankName}</p>
 <p className="text-xs sm:text-sm text-gray-600">Acc: {account.accountNumber}</p>
 <p className="text-xs text-gray-500">
 SWIFT: {account.swift} {account.iban && `• IBAN: ${account.iban}`}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {account.isDefault && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Default</span>}
 <button className="text-green-600 hover:text-green-800">
 <FaEdit />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )

 const renderAnalytics = () => {
 const month = earnings.thisMonth ?? 0

 // Compute revenue breakdown from actual transactions
 const totalAmount = transactions.reduce((sum, t) => sum + (t.amount ?? 0), 0)
 const consultationAmount = transactions
 .filter((t) => t.type === 'consultation')
 .reduce((sum, t) => sum + (t.amount ?? 0), 0)
 const videoAmount = transactions
 .filter((t) => t.type === 'video_consultation')
 .reduce((sum, t) => sum + (t.amount ?? 0), 0)
 const procedureAmount = transactions
 .filter((t) => t.type === 'procedure')
 .reduce((sum, t) => sum + (t.amount ?? 0), 0)
 const emergencyAmount = transactions
 .filter((t) => t.type === 'emergency')
 .reduce((sum, t) => sum + (t.amount ?? 0), 0)

 const toPct = (amount: number) =>
 totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0

 const consultationPct = toPct(consultationAmount)
 const videoPct = toPct(videoAmount)
 const procedurePct = toPct(procedureAmount)
 const emergencyPct = toPct(emergencyAmount)

 // Monthly comparison: use thisWeek as a proxy for last-month estimate if no explicit prev-month field
 const thisYear = earnings.thisYear ?? 0
 const monthsElapsed = new Date().getMonth() + 1
 const avgMonthlyFromYear = monthsElapsed > 1 && thisYear > 0
 ? Math.round((thisYear - month) / (monthsElapsed - 1))
 : null
 const lastMonthEstimate = avgMonthlyFromYear ?? null
 const monthGrowth =
 lastMonthEstimate && lastMonthEstimate > 0
 ? (((month - lastMonthEstimate) / lastMonthEstimate) * 100).toFixed(1)
 : null

 return (
 <div className="space-y-4">
 {/* Revenue Breakdown */}
 <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 border border-indigo-200">
 <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Revenue Breakdown</h3>
 {transactions.length === 0 ? (
 <p className="text-sm text-gray-500">No transaction data available for breakdown.</p>
 ) : (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-blue-500 rounded-full" />
 <span className="text-xs sm:text-sm">Consultations</span>
 </div>
 <span className="font-medium text-sm">{consultationPct}%</span>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-green-500 rounded-full" />
 <span className="text-xs sm:text-sm">Video Consultations</span>
 </div>
 <span className="font-medium text-sm">{videoPct}%</span>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-purple-500 rounded-full" />
 <span className="text-xs sm:text-sm">Procedures</span>
 </div>
 <span className="font-medium text-sm">{procedurePct}%</span>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-orange-500 rounded-full" />
 <span className="text-xs sm:text-sm">Emergency</span>
 </div>
 <span className="font-medium text-sm">{emergencyPct}%</span>
 </div>
 </div>
 )}
 </div>

 {/* Monthly Comparison */}
 <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 border border-orange-200">
 <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">Monthly Comparison</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-gray-600">This Month</p>
 <p className="text-lg sm:text-xl font-bold text-orange-700">Rs {month.toLocaleString()}</p>
 </div>
 <div>
 <p className="text-xs text-gray-600">Last Month (est.)</p>
 <p className="text-lg sm:text-xl font-bold text-gray-700">
 {lastMonthEstimate !== null ? `Rs ${lastMonthEstimate.toLocaleString()}` : 'N/A'}
 </p>
 </div>
 </div>
 {monthGrowth !== null && (
 <div className="mt-3 pt-3 border-t border-orange-200">
 <div className="flex items-center gap-2">
 {parseFloat(monthGrowth) >= 0 ? (
 <FaArrowUp className="text-green-500" />
 ) : (
 <FaArrowDown className="text-red-500" />
 )}
 <span className={`text-sm ${parseFloat(monthGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
 {parseFloat(monthGrowth) >= 0 ? '+' : ''}{monthGrowth}% from last month (est.)
 </span>
 </div>
 </div>
 )}
 </div>

 {/* Export Options */}
 <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 border border-gray-200">
 <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3">Export Reports</h3>
 <div className="grid grid-cols-2 gap-2">
 <button className="p-3 bg-white transition text-xs sm:text-sm">
 <FaDownload className="inline mr-1" />
 Monthly Report
 </button>
 <button className="p-3 bg-white transition text-xs sm:text-sm">
 <FaFileInvoice className="inline mr-1" />
 Tax Report
 </button>
 <button className="p-3 bg-white transition text-xs sm:text-sm">
 <FaChartPie className="inline mr-1" />
 Analytics PDF
 </button>
 <button className="p-3 bg-white transition text-xs sm:text-sm">
 <FaHistory className="inline mr-1" />
 Transaction History
 </button>
 </div>
 </div>
 </div>
 )
 }

 return (
 <div className="space-y-4 sm:space-y-5 md:space-y-6">
 {/* Header */}
 <div className="bg-brand-navy rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white">
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
 <div>
 <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 flex items-center">
 <FaMoneyBillWave className="mr-2 sm:mr-3" />
 Billing & Earnings
 </h2>
 <p className="opacity-90 text-xs sm:text-sm md:text-base">Track your income and manage payments</p>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
 <div className="bg-sky-100/20 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
 <p className="text-lg sm:text-xl md:text-2xl font-bold">Rs {(((earnings.today ?? 0) as number) / 1000).toFixed(1)}k</p>
 <p className="text-xs opacity-90">Today</p>
 </div>
 <div className="bg-sky-100/20 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
 <p className="text-lg sm:text-xl md:text-2xl font-bold">Rs {(((earnings.thisMonth ?? 0) as number) / 1000).toFixed(0)}k</p>
 <p className="text-xs opacity-90">Month</p>
 </div>
 <div className="bg-sky-100/20 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
 <p className="text-lg sm:text-xl md:text-2xl font-bold">{transactions.length}</p>
 <p className="text-xs opacity-90">Transactions</p>
 </div>
 </div>
 </div>
 </div>

 {/* Search and Filters */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-200">
 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
 <div className="flex-1 relative">
 <FaSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
 <input
 type="text"
 placeholder="Search transactions..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition text-sm sm:text-base"
 />
 </div>

 <button
 onClick={() => setShowFilters(!showFilters)}
 className="px-4 sm:px-6 py-2.5 sm:py-3 bg-sky-50 text-gray-700 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-2 text-sm sm:text-base"
 >
 <FaFilter />
 <span className="hidden sm:inline">Filters</span>
 {showFilters ? <FaChevronUp /> : <FaChevronDown />}
 </button>
 </div>

 {showFilters && (
 <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3 md:gap-4">
 <select
 value={filters.type}
 onChange={(e) => setFilters({ ...filters, type: e.target.value as FilterOptions['type'] })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm sm:text-base"
 >
 <option value="all">All Types</option>
 <option value="consultation">Consultation</option>
 <option value="video_consultation">Video Consultation</option>
 <option value="procedure">Procedure</option>
 <option value="emergency">Emergency</option>
 </select>

 <select
 value={filters.status}
 onChange={(e) => setFilters({ ...filters, status: e.target.value as FilterOptions['status'] })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm sm:text-base"
 >
 <option value="all">All Status</option>
 <option value="completed">Completed</option>
 <option value="pending">Pending</option>
 <option value="failed">Failed</option>
 <option value="refunded">Refunded</option>
 </select>

 <select
 value={filters.paymentMethod}
 onChange={(e) =>
 setFilters({ ...filters, paymentMethod: e.target.value as FilterOptions['paymentMethod'] })
 }
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm sm:text-base"
 >
 <option value="all">All Methods</option>
 <option value="cash">Cash</option>
 <option value="card">Card</option>
 <option value="insurance">Insurance</option>
 <option value="mcb_juice">MCB Juice</option>
 </select>

 <select
 value={filters.dateRange}
 onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as FilterOptions['dateRange'] })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm sm:text-base"
 >
 <option value="all">All Time</option>
 <option value="today">Today</option>
 <option value="week">This Week</option>
 <option value="month">This Month</option>
 <option value="year">This Year</option>
 </select>
 </div>
 )}
 </div>

 {/* Mobile Accordion / Desktop Tabs */}
 <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
 {/* Desktop Tab Navigation */}
 <div className="hidden sm:block border-b border-gray-200">
 <div className="flex overflow-x-auto">
 {sections.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as typeof activeTab)}
 className={`flex-shrink-0 px-3 md:px-6 py-3 md:py-4 text-center font-medium transition-all flex items-center gap-1.5 md:gap-2 ${
 activeTab === tab.id
 ? `text-${tab.color}-600 border-b-2 border-current from-${tab.color}-50 to-transparent`
 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
 }`}
 title={tab.label}
 >
 <tab.icon className="text-base md:text-base" />
 <span className="hidden md:inline whitespace-nowrap text-sm md:text-base">{tab.label}</span>
 {tab.count !== undefined && tab.count > 0 && (
 <span className="bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
 )}
 </button>
 ))}
 </div>
 </div>

 {/* Content */}
 <div className="p-4 md:p-6 pb-20 sm:pb-0">
 {activeTab === 'overview' && renderEarningsOverview()}
 {activeTab === 'transactions' && (
 <div className="space-y-3 sm:space-y-4">
 {filterTransactions(transactions).map(renderTransactionCard)}
 {filterTransactions(transactions).length === 0 && (
 <div className="text-center py-8">
 <FaFileInvoice className="text-gray-400 text-4xl mx-auto mb-3" />
 <p className="text-gray-500">No transactions found</p>
 </div>
 )}
 </div>
 )}
 {activeTab === 'payments' && renderPaymentMethods()}
 {activeTab === 'analytics' && renderAnalytics()}
 </div>
 </div>

 {/* Mobile Bottom Tab Bar */}
 <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-50 shadow-lg">
 {sections.map((section) => {
 const Icon = section.icon
 const isActive = activeTab === section.id
 return (
 <button key={section.id} onClick={() => setActiveTab(section.id as typeof activeTab)}
 className={`flex flex-col items-center justify-center p-1 min-w-[40px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
 <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
 {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-1" />}
 </button>
 )
 })}
 </div>
 </div>
 )
}

export default BillingEarnings
