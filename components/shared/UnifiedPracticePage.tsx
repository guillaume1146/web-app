'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import {
  FaSpinner, FaCalendarAlt, FaCheck, FaTimes, FaCheckCircle,
  FaSearch, FaClock, FaClipboardList, FaHistory, FaPlay,
  FaVideo, FaUser, FaHome, FaHospital,
} from 'react-icons/fa'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Booking {
  id: string
  bookingType: string
  providerName: string
  providerRole: string
  providerSpecialty?: string
  serviceName?: string
  scheduledAt: string
  status: string
  price: number | null
  availableActions: string[]
  patientName?: string
  type?: string
  reason?: string
  duration?: number
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UnifiedPracticePage() {
  const user = useDashboardUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const res = await fetch('/api/bookings/unified?role=provider')
      const json = await res.json()
      if (json.success && json.data) {
        setBookings(json.data)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleAction = async (bookingId: string, bookingType: string, action: string) => {
    if (!user) return
    setActionLoading(bookingId)
    try {
      if (action === 'complete') {
        // Try workflow transition first, fallback to direct update
        const wfRes = await fetch('/api/workflow/transition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, bookingType, action: 'complete' }),
        })
        if (!wfRes.ok) {
          // Fallback: direct status update for bookings without workflow
          await fetch('/api/bookings/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId, bookingType: mapBookingType(bookingType), action: 'accept' }),
          })
        }
      } else {
        // accept/deny go through the action endpoint
        await fetch('/api/bookings/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, bookingType: mapBookingType(bookingType), action }),
        })
      }
      await fetchBookings()
    } catch {
      setError('Action failed. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Filters ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = !searchTerm ||
        (b.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [bookings, searchTerm, statusFilter])

  const pendingBookings = filtered.filter(b => b.status === 'pending')
  const activeBookings = filtered.filter(b => ['accepted', 'upcoming', 'confirmed', 'in_progress', 'dispatched', 'en_route'].includes(b.status))
  const completedBookings = filtered.filter(b => ['completed', 'resolved'].includes(b.status))
  const cancelledBookings = filtered.filter(b => b.status === 'cancelled')

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    pending: bookings.filter(b => b.status === 'pending').length,
    active: bookings.filter(b => ['accepted', 'upcoming', 'confirmed', 'in_progress', 'dispatched', 'en_route'].includes(b.status)).length,
    today: bookings.filter(b => {
      const d = new Date(b.scheduledAt)
      const now = new Date()
      return d.toDateString() === now.toDateString() && !['completed', 'cancelled', 'resolved'].includes(b.status)
    }).length,
    completed: bookings.filter(b => ['completed', 'resolved'].includes(b.status)).length,
  }), [bookings])

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!user) return null

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <FaSpinner className="animate-spin text-[#0C6780] text-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Practice</h1>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)}><FaTimes className="text-red-400 hover:text-red-600" /></button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={FaClock} label="Pending" value={stats.pending} color="text-yellow-600" bgColor="bg-yellow-50" onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')} active={statusFilter === 'pending'} />
        <StatCard icon={FaCalendarAlt} label="Today" value={stats.today} color="text-blue-600" bgColor="bg-blue-50" onClick={() => setStatusFilter('all')} active={false} />
        <StatCard icon={FaClipboardList} label="Active" value={stats.active} color="text-green-600" bgColor="bg-green-50" onClick={() => setStatusFilter(statusFilter === 'accepted' ? 'all' : 'accepted')} active={statusFilter === 'accepted'} />
        <StatCard icon={FaHistory} label="Completed" value={stats.completed} color="text-gray-600" bgColor="bg-gray-50" onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')} active={statusFilter === 'completed'} />
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search patient, service, reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0C6780] focus:border-transparent outline-none text-sm bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0C6780] focus:border-transparent outline-none bg-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="upcoming">Upcoming</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FaCalendarAlt className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">When patients book your services, they will appear here.</p>
        </div>
      )}

      {/* Booking Sections */}
      {pendingBookings.length > 0 && (
        <BookingSection title="Pending Requests" count={pendingBookings.length} color="yellow" bookings={pendingBookings} onAction={handleAction} actionLoading={actionLoading} />
      )}
      {activeBookings.length > 0 && (
        <BookingSection title="Active" count={activeBookings.length} color="green" bookings={activeBookings} onAction={handleAction} actionLoading={actionLoading} />
      )}
      {completedBookings.length > 0 && (
        <BookingSection title="Completed" count={completedBookings.length} color="gray" bookings={completedBookings} onAction={handleAction} actionLoading={actionLoading} />
      )}
      {cancelledBookings.length > 0 && (
        <BookingSection title="Cancelled" count={cancelledBookings.length} color="red" bookings={cancelledBookings} onAction={handleAction} actionLoading={actionLoading} />
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bgColor, onClick, active }: {
  icon: React.ComponentType<{ className?: string }>
  label: string; value: number; color: string; bgColor: string
  onClick: () => void; active: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        active ? 'border-[#0C6780] ring-2 ring-[#0C6780]/20 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`${color} text-lg`} />
      </div>
      <div className="text-left">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </button>
  )
}

function BookingSection({ title, count, color, bookings, onAction, actionLoading }: {
  title: string; count: number; color: string
  bookings: Booking[]; onAction: (id: string, type: string, action: string) => void; actionLoading: string | null
}) {
  const borderColor = color === 'yellow' ? 'border-yellow-200' : color === 'green' ? 'border-green-200' : color === 'red' ? 'border-red-200' : 'border-gray-200'
  const headerColor = color === 'yellow' ? 'text-yellow-700' : color === 'green' ? 'text-green-700' : color === 'red' ? 'text-red-700' : 'text-gray-500'

  return (
    <div>
      <h2 className={`text-sm font-semibold ${headerColor} mb-2`}>{title} ({count})</h2>

      {/* Desktop Table */}
      <div className={`hidden sm:block bg-white rounded-xl border ${borderColor} overflow-hidden`}>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Service</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.map(b => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#0C6780]/10 flex items-center justify-center text-xs font-bold text-[#0C6780]">
                      {(b.patientName || 'P').split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{b.patientName || 'Patient'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{b.serviceName || b.providerSpecialty || 'Consultation'}</p>
                  {b.reason && <p className="text-xs text-gray-400 truncate max-w-[180px]">{b.reason}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-700">{new Date(b.scheduledAt).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-400">{new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </td>
                <td className="px-4 py-3">
                  <TypeBadge type={b.type} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {b.price != null && b.price > 0 ? (
                    <span className="text-sm font-medium text-gray-700">Rs {b.price.toLocaleString()}</span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ActionButtons booking={b} onAction={onAction} loading={actionLoading === b.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className={`sm:hidden bg-white rounded-xl border ${borderColor} divide-y divide-gray-100`}>
        {bookings.map(b => (
          <div key={b.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0C6780]/10 flex items-center justify-center text-xs font-bold text-[#0C6780]">
                  {(b.patientName || 'P').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span className="text-sm font-medium text-gray-900">{b.patientName || 'Patient'}</span>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-sm text-gray-700">{b.serviceName || 'Consultation'}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{new Date(b.scheduledAt).toLocaleDateString()} at {new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {b.price != null && b.price > 0 && <span className="font-medium text-gray-600">Rs {b.price.toLocaleString()}</span>}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <TypeBadge type={b.type} />
              <ActionButtons booking={b} onAction={onAction} loading={actionLoading === b.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    upcoming: 'bg-green-100 text-green-700',
    confirmed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    dispatched: 'bg-blue-100 text-blue-700',
    en_route: 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-600',
    resolved: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function TypeBadge({ type }: { type?: string }) {
  if (!type) return null
  const icon = type === 'video' ? FaVideo : type === 'home_visit' || type === 'home' ? FaHome : type === 'in_person' || type === 'office' ? FaHospital : FaUser
  const Icon = icon
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#0C6780]/10 text-[#0C6780] font-medium">
      <Icon className="text-[8px]" />
      {(type || '').replace(/_/g, ' ')}
    </span>
  )
}

function ActionButtons({ booking, onAction, loading }: {
  booking: Booking; onAction: (id: string, type: string, action: string) => void; loading: boolean
}) {
  const b = booking
  if (loading) return <FaSpinner className="animate-spin text-gray-400 text-sm" />

  return (
    <div className="flex items-center gap-1.5 justify-center">
      {b.availableActions?.includes('accept') && (
        <button onClick={() => onAction(b.id, b.bookingType, 'accept')} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
          <FaCheck className="text-[10px]" /> Accept
        </button>
      )}
      {b.availableActions?.includes('deny') && (
        <button onClick={() => onAction(b.id, b.bookingType, 'deny')} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">
          <FaTimes className="text-[10px]" /> Decline
        </button>
      )}
      {b.availableActions?.includes('complete') && (
        <button onClick={() => onAction(b.id, b.bookingType, 'complete')} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
          <FaCheckCircle className="text-[10px]" /> Complete
        </button>
      )}
      {b.status === 'in_progress' && !b.availableActions?.includes('complete') && (
        <button onClick={() => onAction(b.id, b.bookingType, 'complete')} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
          <FaPlay className="text-[10px]" /> Finish
        </button>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapBookingType(type: string): string {
  const map: Record<string, string> = {
    appointment: 'doctor',
    nurse_booking: 'nurse',
    childcare_booking: 'nanny',
    lab_test_booking: 'lab_test',
    emergency_booking: 'emergency',
    service_booking: 'service',
  }
  return map[type] || type
}
