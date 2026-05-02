'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaCalendarCheck, FaSearch } from 'react-icons/fa'
import { FiClock, FiCheckCircle, FiXCircle, FiActivity, FiList } from 'react-icons/fi'
import { CATEGORY_BADGE, type StepCategory } from '@/components/workflow/stepCategoryStyles'

interface WorkflowInstance {
  instanceId: string
  templateName: string
  bookingId: string
  bookingType: string
  serviceMode: string
  currentStatus: string
  currentStepLabel: string
  currentStepCategory: StepCategory
  isCompleted: boolean
  isCancelled: boolean
  startedAt: string
  completedAt: string | null
}

type FilterTab = 'all' | 'active' | 'pending' | 'done'

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: FiList },
  { key: 'pending', label: 'Pending', icon: FiClock },
  { key: 'active', label: 'Active', icon: FiActivity },
  { key: 'done', label: 'Done', icon: FiCheckCircle },
]

function matchesFilter(instance: WorkflowInstance, filter: FilterTab): boolean {
  if (filter === 'all') return true
  if (filter === 'pending') return instance.currentStepCategory === 'pending'
  if (filter === 'active') return instance.currentStepCategory === 'active' || instance.currentStepCategory === 'waiting'
  if (filter === 'done') return instance.isCompleted || instance.isCancelled
  return true
}

function bookingHref(instance: WorkflowInstance): string {
  return `/patient/bookings/${instance.bookingType}/${instance.bookingId}`
}

export default function PatientBookingsPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')

  useEffect(() => {
    fetch('/api/workflow/instances?role=patient', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setInstances(d.data ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = instances.filter(i => matchesFilter(i, filter))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-teal" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">
            {instances.length} booking{instances.length !== 1 ? 's' : ''} across all services
          </p>
        </div>
        <Link
          href="/search/providers"
          className="flex items-center gap-2 text-sm text-brand-teal hover:text-brand-navy font-medium"
        >
          <FaSearch className="w-3.5 h-3.5" /> Find a Provider
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === key
                ? 'bg-brand-navy text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center border border-gray-100">
          <FaCalendarCheck className="text-4xl text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
          </h3>
          <p className="text-gray-400 text-sm mb-5">
            {filter === 'all'
              ? 'Book a consultation with a doctor, nurse, or any other provider to get started.'
              : 'Try a different filter to see other bookings.'}
          </p>
          {filter === 'all' && (
            <Link href="/search/providers" className="text-brand-teal hover:text-brand-navy font-medium text-sm">
              Browse Providers →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((instance) => {
            const badge = CATEGORY_BADGE[instance.currentStepCategory ?? 'active']
            return (
              <Link
                key={instance.instanceId}
                href={bookingHref(instance)}
                className="block bg-white rounded-xl p-4 sm:p-5 border border-gray-100 hover:border-brand-teal hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{instance.templateName}</h3>
                      <span className="text-xs text-gray-400 capitalize">{instance.bookingType.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-brand-teal font-medium mt-1">{instance.currentStepLabel}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(instance.startedAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`${badge.bg} ${badge.text} px-2.5 py-0.5 rounded-full text-xs font-medium capitalize`}>
                      {instance.currentStatus.replace(/_/g, ' ')}
                    </span>
                    {instance.isCompleted && <FiCheckCircle className="w-4 h-4 text-green-500" />}
                    {instance.isCancelled && <FiXCircle className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
