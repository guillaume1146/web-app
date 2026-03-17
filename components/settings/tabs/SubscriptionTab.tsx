'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaCrown, FaCheckCircle, FaSpinner, FaExchangeAlt } from 'react-icons/fa'
import { getCurrencySymbol } from '@/lib/currency'

interface Plan {
  id: string
  name: string
  slug: string
  type: string
  price: number
  currency: string
  gpConsultsPerMonth: number
  specialistConsultsPerMonth: number
  nurseConsultsPerMonth: number
  mentalHealthConsultsPerMonth: number
  features: string[]
}

interface CurrentSubscription {
  hasSubscription: boolean
  status?: string
  plan?: Plan
  usage?: Record<string, number>
}

// Keep the old interface for backward compatibility
export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency?: string
  period: 'monthly' | 'yearly'
  features: string[]
  isCurrent?: boolean
}

interface SubscriptionTabProps {
  plans?: SubscriptionPlan[]
  currentPlanId?: string
  userId?: string
}

const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ userId }) => {
  const [current, setCurrent] = useState<CurrentSubscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch(`/api/users/${userId}/subscription`),
        fetch('/api/subscriptions?type=individual'),
      ])
      const subJson = await subRes.json()
      const plansJson = await plansRes.json()

      if (subJson.success) setCurrent(subJson.data)
      if (plansJson.success) setPlans(plansJson.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleChangePlan = async (planId: string) => {
    if (!userId) return
    setChanging(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/users/${userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: current?.hasSubscription ? 'change' : 'subscribe', planId }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage({ type: 'success', text: json.message || 'Plan updated successfully' })
        fetchData()
      } else {
        setMessage({ type: 'error', text: json.message || 'Failed to change plan' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setChanging(false)
    }
  }

  const handleCancel = async () => {
    if (!userId || !confirm('Are you sure you want to cancel your subscription?')) return
    setChanging(true)
    try {
      const res = await fetch(`/api/users/${userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage({ type: 'success', text: 'Subscription cancelled' })
        fetchData()
      } else {
        setMessage({ type: 'error', text: json.message || 'Failed to cancel' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setChanging(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-blue-500 text-xl" />
      </div>
    )
  }

  const currentPlanId = current?.plan?.id

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        <FaCrown className="text-yellow-500" /> Subscription Management
      </h2>

      {/* Current plan summary */}
      {current?.hasSubscription && current.plan ? (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm text-blue-600 font-medium">Current Plan</p>
              <p className="text-lg font-bold text-gray-900">{current.plan.name}</p>
              <p className="text-sm text-gray-600">
                {getCurrencySymbol(current.plan.currency)} {current.plan.price.toLocaleString()}/month
                {current.status === 'active' && <span className="ml-2 text-green-600 font-medium">Active</span>}
              </p>
            </div>
            <button
              onClick={handleCancel}
              disabled={changing}
              className="text-sm text-red-500 hover:text-red-700 underline"
            >
              Cancel Plan
            </button>
          </div>

          {/* Usage summary */}
          {current.usage && (
            <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'GP', used: current.usage.gpConsultsUsed, limit: current.usage.gpConsultsLimit },
                { label: 'Specialist', used: current.usage.specialistConsultsUsed, limit: current.usage.specialistConsultsLimit },
                { label: 'Nurse', used: current.usage.nurseConsultsUsed, limit: current.usage.nurseConsultsLimit },
                { label: 'Mental Health', used: current.usage.mentalHealthConsultsUsed, limit: current.usage.mentalHealthConsultsLimit },
                { label: 'Nutrition', used: current.usage.nutritionConsultsUsed, limit: current.usage.nutritionConsultsLimit },
                { label: 'Ambulance', used: current.usage.ambulanceUsed, limit: current.usage.ambulanceLimit },
              ].filter(s => (s.limit ?? 0) !== 0).map(s => (
                <div key={s.label} className="text-xs">
                  <span className="text-gray-500">{s.label}:</span>{' '}
                  <span className="font-medium">{s.used ?? 0}/{s.limit === -1 ? '∞' : s.limit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-500">You don&apos;t have an active subscription. Choose a plan below.</p>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Available plans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.id
          return (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 text-center transition-all ${
                isCurrent ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'
              }`}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold mb-4">
                {plan.price > 0 ? `${getCurrencySymbol(plan.currency)} ${plan.price.toLocaleString()}` : 'Free'}
                <span className="text-base font-normal text-gray-500">/month</span>
              </p>
              <ul className="space-y-2 text-gray-600 mb-6 text-sm text-left">
                {(plan.features as string[]).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <FaCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" /> {feature}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="w-full py-2.5 rounded-lg font-semibold bg-blue-600 text-white">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleChangePlan(plan.id)}
                  disabled={changing}
                  className="w-full py-2.5 rounded-lg font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition flex items-center justify-center gap-2"
                >
                  {changing ? <FaSpinner className="animate-spin" /> : <FaExchangeAlt />}
                  {current?.hasSubscription ? 'Switch Plan' : 'Subscribe'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SubscriptionTab
