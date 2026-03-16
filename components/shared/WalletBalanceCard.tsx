'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaWallet, FaArrowDown, FaArrowUp, FaChevronDown, FaChevronUp, FaRedo } from 'react-icons/fa'
import WalletTransactionHistory from './WalletTransactionHistory'
import WalletTopUp from './WalletTopUp'

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  serviceType: string | null
  balanceBefore: number
  balanceAfter: number
  status: string
  createdAt: string
}

interface WalletData {
  balance: number
  currency: string
  initialCredit: number
  transactions: Transaction[]
}

interface WalletBalanceCardProps {
  userId: string
}

const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({ userId }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [resetting, setResetting] = useState(false)

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/users/${userId}/wallet`)
      const json = await res.json()
      if (json.success && json.data) {
        setWallet(json.data)
      } else {
        setWallet(null)
      }
    } catch {
      setError('Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetchWallet()
  }, [userId, fetchWallet])

  const handleResetTrial = async () => {
    if (!confirm('Reset your trial balance to the initial credit amount?')) return
    try {
      setResetting(true)
      const res = await fetch(`/api/users/${userId}/wallet/reset`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        await fetchWallet()
      } else {
        alert(json.message || 'Failed to reset trial')
      }
    } catch {
      alert('Failed to reset trial')
    } finally {
      setResetting(false)
    }
  }

  if (!userId) return null

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-white/30 rounded" />
          <div className="h-5 w-28 bg-white/30 rounded" />
        </div>
        <div className="h-8 w-36 bg-white/30 rounded mb-3" />
        <div className="h-2.5 w-full bg-white/20 rounded-full mb-2" />
        <div className="h-4 w-48 bg-white/20 rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        {error}
      </div>
    )
  }

  if (!wallet) return null

  const percentage = wallet.initialCredit > 0
    ? Math.round((wallet.balance / wallet.initialCredit) * 100)
    : 0

  const recentTransactions = wallet.transactions.slice(0, 3)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-3">
      {/* Main Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <FaWallet className="text-white/90 text-base sm:text-lg" />
          <h3 className="text-sm sm:text-base font-semibold text-white/90">Trial Balance</h3>
        </div>

        <p className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
          Rs {wallet.balance.toLocaleString()}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-2 sm:h-2.5 mb-2">
          <div
            className="bg-white rounded-full h-2 sm:h-2.5 transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm text-white/80">
            {percentage}% remaining of Rs {wallet.initialCredit.toLocaleString()}
          </p>
          <button
            onClick={handleResetTrial}
            disabled={resetting || wallet.balance === wallet.initialCredit}
            className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            <FaRedo className={`text-[10px] ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset Trial'}
          </button>
        </div>

        {/* Recent Transactions Mini-List */}
        {recentTransactions.length > 0 && (
          <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-white/20 space-y-2 sm:space-y-3">
            {recentTransactions.map((tx) => {
              const isCredit = tx.type === 'CREDIT'
              return (
                <div key={tx.id} className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${isCredit ? 'bg-green-400/30' : 'bg-red-400/30'}`}>
                    {isCredit ? (
                      <FaArrowUp className="text-green-200 text-xs" />
                    ) : (
                      <FaArrowDown className="text-red-200 text-xs" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-white/60">
                      {tx.serviceType ? `${tx.serviceType} \u2022 ` : ''}{formatDate(tx.createdAt)}
                    </p>
                  </div>
                  <p className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${isCredit ? 'text-green-300' : 'text-red-300'}`}>
                    {isCredit ? '+' : '-'}Rs {Math.abs(tx.amount).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* View Transaction History Toggle */}
        {wallet.transactions.length > 0 && (
          <button
            onClick={() => setShowAllTransactions(!showAllTransactions)}
            className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {showAllTransactions ? (
              <>
                Hide Transaction History <FaChevronUp className="text-xs" />
              </>
            ) : (
              <>
                View Transaction History <FaChevronDown className="text-xs" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Wallet Top-Up */}
      <WalletTopUp userId={userId} onSuccess={fetchWallet} />

      {/* Full Transaction History */}
      {showAllTransactions && wallet.transactions.length > 0 && (
        <WalletTransactionHistory transactions={wallet.transactions} />
      )}
    </div>
  )
}

export default WalletBalanceCard
