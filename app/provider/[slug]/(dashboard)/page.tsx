'use client'

import { useParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { FaCalendarCheck, FaComments, FaMoneyBillWave, FaRobot } from 'react-icons/fa'
import Link from 'next/link'

export default function DynamicProviderDashboard() {
  const params = useParams()
  const slug = params.slug as string
  const base = `/provider/${slug}`
  const { user } = useUser()

  const quickLinks = [
    { label: 'My Practice', href: `${base}/practice`, icon: FaCalendarCheck, color: 'bg-blue-50 text-blue-600' },
    { label: 'Messages', href: `${base}/messages`, icon: FaComments, color: 'bg-green-50 text-green-600' },
    { label: 'Billing', href: `${base}/billing`, icon: FaMoneyBillWave, color: 'bg-purple-50 text-purple-600' },
    { label: 'AI Assistant', href: `${base}/ai-assistant`, icon: FaRobot, color: 'bg-teal-50 text-teal-600' },
  ]

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">Here is your dashboard overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center`}>
              <link.icon className="text-lg" />
            </div>
            <span className="text-sm font-medium text-gray-700">{link.label}</span>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Recent Activity</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">
            View appointments, bookings, and patient activity in{' '}
            <Link href={`${base}/practice`} className="text-[#0C6780] font-medium hover:underline">
              My Practice
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
