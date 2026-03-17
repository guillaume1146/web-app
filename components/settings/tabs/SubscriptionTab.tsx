'use client'

import { useState } from 'react'
import { FaCrown, FaCheckCircle } from 'react-icons/fa'
import { getCurrencySymbol } from '@/lib/currency'

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
  plans: SubscriptionPlan[]
  currentPlanId?: string
}

const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ plans, currentPlanId: initialPlan }) => {
  const [selectedPlan, setSelectedPlan] = useState(initialPlan || plans.find((p) => p.isCurrent)?.id || plans[0]?.id)

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <FaCrown className="text-yellow-500" /> Subscription Management
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id
          return (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 text-center transition-all ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'hover:shadow-lg'
              }`}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold mb-4">
                {plan.price > 0 ? `${getCurrencySymbol(plan.currency || 'MUR')} ${plan.price.toLocaleString()}` : 'Free'}
                <span className="text-base font-normal text-gray-500">/{plan.period}</span>
              </p>
              <ul className="space-y-2 text-gray-600 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center justify-center gap-2">
                    <FaCheckCircle className="text-green-500 flex-shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full py-2.5 rounded-lg font-semibold transition ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {isSelected ? 'Current Plan' : 'Choose Plan'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SubscriptionTab
