'use client'

import { useState, useEffect } from 'react'
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol as getSymbol } from '@/lib/currency'

interface UseCurrencyResult {
  currency: string
  symbol: string
  format: (amount: number) => string
  loading: boolean
}

/**
 * Client hook to get the user's currency from their wallet.
 * Falls back to MUR if not loaded.
 */
export function useCurrency(userId?: string): UseCurrencyResult {
  const [currency, setCurrency] = useState('MUR')
  const [loading, setLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    async function fetchCurrency() {
      try {
        const res = await fetch(`/api/users/${userId}/wallet`)
        const json = await res.json()
        if (!cancelled && json.success && json.data?.currency) {
          setCurrency(json.data.currency)
        }
      } catch {
        // fallback to MUR
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCurrency()
    return () => { cancelled = true }
  }, [userId])

  return {
    currency,
    symbol: getSymbol(currency),
    format: (amount: number) => formatCurrencyUtil(amount, currency),
    loading,
  }
}
