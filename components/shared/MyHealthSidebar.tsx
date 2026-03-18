'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { FaStethoscope, FaPills, FaFileAlt, FaShieldAlt, FaTimes, FaUser, FaChevronRight } from 'react-icons/fa'
import { useProviderRoles } from '@/hooks/useProviderRoles'

const ConsultationsContent = dynamic(() => import('@/components/health/MyConsultations'), { ssr: false, loading: () => <Loading /> })
const PrescriptionsContent = dynamic(() => import('@/components/health/MyPrescriptions'), { ssr: false, loading: () => <Loading /> })
const HealthRecordsContent = dynamic(() => import('@/components/health/MyHealthRecords'), { ssr: false, loading: () => <Loading /> })
const InsuranceContent = dynamic(() => import('@/components/health/MyInsurance'), { ssr: false, loading: () => <Loading /> })

function Loading() {
  return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
}

// Generic service bookings list for any provider role
function ServiceBookingsList({ providerType, title }: { providerType: string; title: string }) {
  const [bookings, setBookings] = useState<{ id: string; providerName: string; serviceName: string | null; scheduledAt: string; status: string; price: number | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bookings/unified?role=patient')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setBookings(json.data.filter((b: { providerRole: string }) => b.providerRole === providerType))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [providerType])

  if (loading) return <Loading />

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      {bookings.length === 0 ? (
        <p className="text-center py-8 text-gray-400 text-sm">No {title.toLowerCase()} bookings yet. Book from the search page.</p>
      ) : (
        <div className="space-y-2">
          {bookings.map(b => (
            <div key={b.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 text-sm truncate">{b.providerName}</p>
                <p className="text-xs text-gray-500">{b.serviceName || title}</p>
                <p className="text-xs text-gray-400">{new Date(b.scheduledAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                b.status === 'completed' ? 'bg-green-100 text-green-700' :
                b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>{b.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Fixed data sections (not role-based)
const FIXED_SECTIONS = [
  { id: 'consult', label: 'Doctor Consultations', icon: FaStethoscope, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'rx', label: 'Prescriptions', icon: FaPills, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 'records', label: 'Health Records', icon: FaFileAlt, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  { id: 'insurance', label: 'Insurance', icon: FaShieldAlt, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
]

const COLOR_MAP: Record<string, { text: string; bg: string }> = {
  blue: { text: 'text-blue-600', bg: 'bg-blue-50' },
  purple: { text: 'text-purple-600', bg: 'bg-purple-50' },
  pink: { text: 'text-pink-600', bg: 'bg-pink-50' },
  teal: { text: 'text-teal-600', bg: 'bg-teal-50' },
  lime: { text: 'text-lime-600', bg: 'bg-lime-50' },
  sky: { text: 'text-sky-600', bg: 'bg-sky-50' },
  violet: { text: 'text-violet-600', bg: 'bg-violet-50' },
  yellow: { text: 'text-yellow-600', bg: 'bg-yellow-50' },
  orange: { text: 'text-orange-600', bg: 'bg-orange-50' },
  cyan: { text: 'text-cyan-600', bg: 'bg-cyan-50' },
  red: { text: 'text-red-600', bg: 'bg-red-50' },
  gray: { text: 'text-gray-600', bg: 'bg-gray-50' },
}

export default function MyHealthSidebar() {
  const [activeSection, setActiveSection] = useState('consult')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { roles } = useProviderRoles()

  // Build sections: fixed + dynamic from DB
  const allSections = useMemo(() => {
    const dynamic = roles.map(r => ({
      id: `role:${r.role}`,
      label: r.label,
      icon: FaUser, // Generic icon — could map per role but FaUser works
      color: COLOR_MAP[r.color]?.text || 'text-gray-600',
      bgColor: COLOR_MAP[r.color]?.bg || 'bg-gray-50',
      providerType: r.role,
    }))
    return [
      ...FIXED_SECTIONS.map(s => ({ ...s, providerType: undefined as string | undefined })),
      ...dynamic,
    ]
  }, [roles])

  const activeItem = allSections.find(s => s.id === activeSection) || allSections[0]

  return (
    <div className="flex h-full flex-row-reverse">
      {/* Mobile: floating button to open sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={`sm:hidden fixed bottom-20 right-3 z-40 flex items-center gap-2 px-3 py-2.5 rounded-full shadow-lg text-sm font-medium ${activeItem?.bgColor} ${activeItem?.color} border border-gray-200`}
      >
        <FaUser className="text-xs" />
        <span className="max-w-[120px] truncate">{activeItem?.label}</span>
        <FaChevronRight className="text-[8px] opacity-60" />
      </button>

      {/* Backdrop */}
      {sidebarOpen && <div className="sm:hidden fixed inset-0 bg-black/30 z-50" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — right side */}
      <div className={`
        fixed sm:sticky top-0 right-0 z-50 sm:z-auto
        h-full w-64 sm:w-52 lg:w-60
        bg-white border-l border-gray-200 overflow-y-auto
        transform transition-transform duration-150 sm:transform-none
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-3 sm:hidden">
          <span className="text-sm font-bold text-gray-900">My Health</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400"><FaTimes /></button>
        </div>

        {/* Fixed sections */}
        <div className="px-2 pt-2">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Records</p>
          <nav className="space-y-0.5">
            {FIXED_SECTIONS.map(s => (
              <button key={s.id} onClick={() => { setActiveSection(s.id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition ${
                  activeSection === s.id ? `${s.bgColor} ${s.color} font-semibold` : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <s.icon className="text-xs flex-shrink-0" /> {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dynamic role sections from DB */}
        <div className="px-2 pt-3">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Provider Services</p>
          <nav className="space-y-0.5 pb-20">
            {roles.map(r => {
              const sectionId = `role:${r.role}`
              const colors = COLOR_MAP[r.color] || COLOR_MAP.gray
              return (
                <button key={sectionId} onClick={() => { setActiveSection(sectionId); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition ${
                    activeSection === sectionId ? `${colors.bg} ${colors.text} font-semibold` : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <FaUser className="text-xs flex-shrink-0" /> {r.label}
                  {r.providerCount > 0 && <span className="ml-auto text-[9px] text-gray-400">{r.providerCount}</span>}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 pb-24 sm:pb-0">
        {activeSection === 'consult' && <ConsultationsContent />}
        {activeSection === 'rx' && <PrescriptionsContent />}
        {activeSection === 'records' && <HealthRecordsContent />}
        {activeSection === 'insurance' && <InsuranceContent />}
        {/* Dynamic role sections — all use ServiceBookingsList */}
        {activeSection.startsWith('role:') && (
          <ServiceBookingsList
            providerType={activeSection.replace('role:', '')}
            title={allSections.find(s => s.id === activeSection)?.label || 'Services'}
          />
        )}
      </div>
    </div>
  )
}
