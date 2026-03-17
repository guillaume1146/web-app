'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaDollarSign, FaClipboardList, FaClock,
  FaBroadcastTower, FaLocationArrow, FaUserInjured, FaSpinner
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { IconType } from 'react-icons'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'

interface StatCardProps {
  icon: IconType
  title: string
  value: string | number
  color: string
}

interface EmergencyRequest {
  id: string
  urgency: string
  incident: string
  location: string
  timestamp: string
  status: string
  patientName: string
  patientPhone: string
}

const StatCard = ({ icon: Icon, title, value, color }: StatCardProps) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="text-white text-xl" />
      </div>
    </div>
  </div>
)

export default function ResponderDashboardPage() {
  const { user: currentUser } = useUser()
  const userId = currentUser?.id ?? ''
  const [loading, setLoading] = useState(true)
  const [currentStatus, setCurrentStatus] = useState<string>('available')
  const [stats, setStats] = useState({
    completedServices: 0,
    walletBalance: 0,
  })
  const [incomingRequests, setIncomingRequests] = useState<EmergencyRequest[]>([])
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/responders/${userId}/dashboard`)
        if (res.ok) {
          const json = await res.json()
          if (json.success) {
            setStats(json.data.stats)
            setIncomingRequests(json.data.incomingRequests || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch responder dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [userId])

  const handleStatusChange = async (newStatus: string) => {
    setCurrentStatus(newStatus)
    // Persist status to availability API
    if (userId) {
      try {
        await fetch(`/api/users/${userId}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      } catch {
        // Status will still update locally
      }
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading({ id: requestId, action: 'accept' })
    try {
      const res = await fetch('/api/bookings/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: requestId, bookingType: 'emergency', action: 'accept' }),
      })
      if (res.ok) {
        setIncomingRequests(prev => prev.filter(r => r.id !== requestId))
        setCurrentStatus('en-route')
      }
    } catch (error) {
      console.error('Failed to accept request:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    setActionLoading({ id: requestId, action: 'deny' })
    try {
      const res = await fetch('/api/bookings/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: requestId, bookingType: 'emergency', action: 'deny' }),
      })
      if (res.ok) {
        setIncomingRequests(prev => prev.filter(r => r.id !== requestId))
      }
    } catch (error) {
      console.error('Failed to decline request:', error)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <>
      {userId && (
        <div className="mb-6">
          <WalletBalanceCard userId={userId} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-6">
        <div className="md:col-span-4 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={FaDollarSign} title="Wallet Balance" value={loading ? '...' : `Rs ${stats.walletBalance.toLocaleString()}`} color="bg-green-500" />
          <StatCard icon={FaClipboardList} title="Completed (Today)" value={loading ? '...' : stats.completedServices} color="bg-blue-500" />
          <StatCard icon={FaClock} title="Active Requests" value={loading ? '...' : incomingRequests.length} color="bg-purple-500" />
        </div>
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl shadow-lg flex flex-col justify-center">
          <label className="text-sm font-medium text-gray-600 mb-2 text-center">Update Live Status</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleStatusChange('available')} className={`py-3 rounded-lg font-semibold transition-colors ${currentStatus === 'available' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-green-100'}`}>Available</button>
            <button onClick={() => handleStatusChange('en-route')} className={`py-3 rounded-lg font-semibold transition-colors ${currentStatus === 'en-route' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-blue-100'}`}>En Route</button>
            <button onClick={() => handleStatusChange('on-scene')} className={`py-3 rounded-lg font-semibold transition-colors ${currentStatus === 'on-scene' ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-orange-100'}`}>On Scene</button>
            <button onClick={() => handleStatusChange('unavailable')} className={`py-3 rounded-lg font-semibold transition-colors ${currentStatus === 'unavailable' ? 'bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Unavailable</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FaBroadcastTower className="text-red-500 animate-pulse" /> Incoming Emergency Requests</h2>
          <Link href="/responder/calls" className="text-red-600 hover:underline font-medium">View All</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <FaSpinner className="animate-spin text-2xl text-red-500" />
          </div>
        ) : incomingRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active emergency requests</p>
        ) : (
          <div className="space-y-4">
            {incomingRequests.map((req) => (
              <div key={req.id} className={`p-4 rounded-lg border-2 ${req.urgency === 'critical' ? 'border-red-500 bg-red-50' : 'border-orange-400 bg-orange-50'}`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${req.urgency === 'critical' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
                        {(req.urgency ?? 'medium').toUpperCase()}
                      </span>
                      <div className="font-semibold text-lg text-gray-800 flex items-center gap-2"><FaUserInjured /> {req.incident}</div>
                    </div>
                    <div className="text-gray-600 text-sm flex items-center gap-6">
                      <span className="flex items-center gap-2"><FaLocationArrow /> {req.location}</span>
                      <span className="flex items-center gap-2"><FaClock /> {new Date(req.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {req.patientName && (
                      <p className="text-sm text-gray-500 mt-1">Patient: {req.patientName} {req.patientPhone ? `(${req.patientPhone})` : ''}</p>
                    )}
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => handleDeclineRequest(req.id)} disabled={actionLoading?.id === req.id} className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {actionLoading?.id === req.id && actionLoading.action === 'deny' && <FaSpinner className="animate-spin" />}
                      Decline
                    </button>
                    <button onClick={() => handleAcceptRequest(req.id)} disabled={actionLoading?.id === req.id} className="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg font-bold hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                      {actionLoading?.id === req.id && actionLoading.action === 'accept' && <FaSpinner className="animate-spin" />}
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
