'use client'

import { useState, useEffect } from 'react'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { FaSpinner, FaCalendarAlt } from 'react-icons/fa'

interface Booking {
  id: string
  providerName: string | null
  scheduledAt: string
  status: string
  serviceName: string | null
  servicePrice: number | null
  patientId: string
  type: string
}

export default function DentistPracticePage() {
  const user = useDashboardUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetch('/api/bookings/service?role=provider')
      .then(r => r.json())
      .then(json => { if (json.success) setBookings(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return null
  if (loading) return <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-500 text-2xl" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Practice</h1>
      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <FaCalendarAlt className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="font-medium">No booking requests yet</p>
          <p className="text-sm mt-1">When patients book your services, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {bookings.map(b => (
            <div key={b.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{b.serviceName || 'Dental Service'}</p>
                <p className="text-sm text-gray-500">{new Date(b.scheduledAt).toLocaleDateString()} at {new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  b.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{b.status}</span>
                {b.servicePrice != null && <span className="text-sm font-medium text-gray-700">Rs {(b.servicePrice ?? 0).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
