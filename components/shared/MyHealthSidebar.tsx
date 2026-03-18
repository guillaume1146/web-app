'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  FaStethoscope, FaPills, FaFileAlt, FaUserNurse, FaBaby,
  FaAmbulance, FaFlask, FaShieldAlt, FaHandHoldingHeart,
  FaWalking, FaTooth, FaEye, FaAppleAlt, FaTimes,
} from 'react-icons/fa'

const ConsultationsContent = dynamic(() => import('@/components/health/MyConsultations'), { ssr: false, loading: () => <Loading /> })
const PrescriptionsContent = dynamic(() => import('@/components/health/MyPrescriptions'), { ssr: false, loading: () => <Loading /> })
const HealthRecordsContent = dynamic(() => import('@/components/health/MyHealthRecords'), { ssr: false, loading: () => <Loading /> })
const NurseServicesContent = dynamic(() => import('@/components/health/MyNurseServices'), { ssr: false, loading: () => <Loading /> })
const ChildcareContent = dynamic(() => import('@/components/health/MyChildcare'), { ssr: false, loading: () => <Loading /> })
const EmergencyContent = dynamic(() => import('@/components/health/MyEmergency'), { ssr: false, loading: () => <Loading /> })
const LabResultsContent = dynamic(() => import('@/components/health/MyLabResults'), { ssr: false, loading: () => <Loading /> })
const InsuranceContent = dynamic(() => import('@/components/health/MyInsurance'), { ssr: false, loading: () => <Loading /> })

function Loading() {
  return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
}

// Generic service bookings list for new provider roles
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
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  b.status === 'completed' ? 'bg-green-100 text-green-700' :
                  b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SECTIONS = [
  { id: 'consult', label: 'Doctor Consultations', icon: FaStethoscope, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'rx', label: 'Prescriptions', icon: FaPills, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 'records', label: 'Health Records', icon: FaFileAlt, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  { id: 'nurse', label: 'Nurse Services', icon: FaUserNurse, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  { id: 'childcare', label: 'Childcare', icon: FaBaby, color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { id: 'emergency', label: 'Emergency', icon: FaAmbulance, color: 'text-red-600', bgColor: 'bg-red-50' },
  { id: 'lab', label: 'Lab Results', icon: FaFlask, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  { id: 'insurance', label: 'Insurance', icon: FaShieldAlt, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { id: 'caregiver', label: 'Caregiver', icon: FaHandHoldingHeart, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  { id: 'physio', label: 'Physiotherapy', icon: FaWalking, color: 'text-lime-600', bgColor: 'bg-lime-50' },
  { id: 'dentist', label: 'Dental Care', icon: FaTooth, color: 'text-sky-600', bgColor: 'bg-sky-50' },
  { id: 'eye', label: 'Eye Care', icon: FaEye, color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { id: 'nutrition', label: 'Nutrition', icon: FaAppleAlt, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
] as const

type SectionId = typeof SECTIONS[number]['id']

export default function MyHealthSidebar() {
  const [activeSection, setActiveSection] = useState<SectionId>('consult')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeItem = SECTIONS.find(s => s.id === activeSection)

  return (
    <div className="flex h-full flex-row-reverse sm:flex-row-reverse">
      {/* Mobile: hamburger to toggle sidebar */}
      <div className="sm:hidden flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 fixed top-[56px] left-0 right-0 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${activeItem?.bgColor} ${activeItem?.color}`}
        >
          {activeItem && <activeItem.icon className="text-sm" />}
          {activeItem?.label}
        </button>
      </div>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="sm:hidden fixed inset-0 bg-black/30 z-50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — right side */}
      <div className={`
        fixed sm:sticky top-0 right-0 z-50 sm:z-auto
        h-full w-64 sm:w-56 lg:w-64
        bg-white border-l border-gray-200 overflow-y-auto
        transform transition-transform duration-150 sm:transform-none
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-3 sm:hidden">
          <span className="text-sm font-bold text-gray-900">My Health</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400"><FaTimes /></button>
        </div>
        <nav className="p-2 space-y-1">
          {SECTIONS.map(section => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                  isActive
                    ? `${section.bgColor} ${section.color} font-semibold`
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`text-base flex-shrink-0 ${isActive ? section.color : 'text-gray-400'}`} />
                <span className="truncate">{section.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 pt-12 sm:pt-0">
        {activeSection === 'consult' && <ConsultationsContent />}
        {activeSection === 'rx' && <PrescriptionsContent />}
        {activeSection === 'records' && <HealthRecordsContent />}
        {activeSection === 'nurse' && <NurseServicesContent />}
        {activeSection === 'childcare' && <ChildcareContent />}
        {activeSection === 'emergency' && <EmergencyContent />}
        {activeSection === 'lab' && <LabResultsContent />}
        {activeSection === 'insurance' && <InsuranceContent />}
        {activeSection === 'caregiver' && <ServiceBookingsList providerType="CAREGIVER" title="Caregiver Services" />}
        {activeSection === 'physio' && <ServiceBookingsList providerType="PHYSIOTHERAPIST" title="Physiotherapy" />}
        {activeSection === 'dentist' && <ServiceBookingsList providerType="DENTIST" title="Dental Care" />}
        {activeSection === 'eye' && <ServiceBookingsList providerType="OPTOMETRIST" title="Eye Care" />}
        {activeSection === 'nutrition' && <ServiceBookingsList providerType="NUTRITIONIST" title="Nutrition" />}
      </div>
    </div>
  )
}
