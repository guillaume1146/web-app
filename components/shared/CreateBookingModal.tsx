'use client'

import { useState, useEffect } from 'react'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { useProviderRoles, ProviderRole } from '@/hooks/useProviderRoles'
import { FaTimes, FaSpinner, FaCalendarAlt, FaSearch } from 'react-icons/fa'

interface Provider {
  id: string
  firstName: string
  lastName: string
  address: string | null
  specializations: string[]
}

interface Service {
  id: string
  serviceName: string
  defaultPrice: number
  category: string
  duration: number | null
}

interface TimeSlot {
  time: string
  available: boolean
}

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  defaultProviderType?: string
}

export default function CreateBookingModal({ isOpen, onClose, onCreated, defaultProviderType }: CreateBookingModalProps) {
  const user = useDashboardUser()
  const { roles } = useProviderRoles()

  const [step, setStep] = useState(1) // 1: role, 2: provider, 3: service, 4: date/time, 5: confirm
  const [selectedRole, setSelectedRole] = useState<ProviderRole | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [consultType, setConsultType] = useState<'in_person' | 'home_visit' | 'video'>('in_person')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select role if default provided
  useEffect(() => {
    if (defaultProviderType && roles.length > 0) {
      const role = roles.find(r => r.role === defaultProviderType)
      if (role) {
        setSelectedRole(role)
        setStep(2)
      }
    }
  }, [defaultProviderType, roles])

  // Fetch providers when role selected
  useEffect(() => {
    if (!selectedRole) return
    setLoading(true)
    fetch(`/api/search/providers?type=${selectedRole.role}`)
      .then(r => r.json())
      .then(json => { if (json.success) setProviders(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedRole])

  // Fetch services when provider selected
  useEffect(() => {
    if (!selectedRole) return
    fetch(`/api/services/catalog?providerType=${selectedRole.role}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const allServices = json.data.flatMap((cat: { services: Service[] }) => cat.services)
          setServices(allServices)
        }
      })
      .catch(() => {})
  }, [selectedRole])

  // Fetch available slots when date selected
  useEffect(() => {
    if (!selectedProvider || !selectedDate) return
    fetch(`/api/bookings/available-slots?providerId=${selectedProvider.id}&date=${selectedDate}&providerType=${selectedRole?.role?.toLowerCase()}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setSlots(json.data.map((s: { time: string; available: boolean }) => s))
        } else {
          // Generate default slots if no availability configured
          const defaultSlots = []
          for (let h = 8; h <= 17; h++) {
            defaultSlots.push({ time: `${h.toString().padStart(2, '0')}:00`, available: true })
            defaultSlots.push({ time: `${h.toString().padStart(2, '0')}:30`, available: true })
          }
          setSlots(defaultSlots)
        }
      })
      .catch(() => {})
  }, [selectedProvider, selectedDate, selectedRole])

  const handleSubmit = async () => {
    if (!user || !selectedProvider || !selectedDate || !selectedTime) return
    setSubmitting(true)
    setError(null)

    try {
      const isOldRole = ['DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER'].includes(selectedRole?.role || '')
      const endpoint = isOldRole
        ? `/api/bookings/${selectedRole?.role === 'DOCTOR' ? 'doctor' : selectedRole?.role === 'NURSE' ? 'nurse' : selectedRole?.role === 'NANNY' ? 'nanny' : selectedRole?.role === 'LAB_TECHNICIAN' ? 'lab-test' : 'emergency'}`
        : '/api/bookings/service'

      const body = isOldRole
        ? {
            [`${selectedRole?.role === 'DOCTOR' ? 'doctor' : selectedRole?.role === 'NURSE' ? 'nurse' : selectedRole?.role === 'NANNY' ? 'nanny' : selectedRole?.role === 'LAB_TECHNICIAN' ? 'labTech' : 'emergency'}Id`]: selectedProvider.id,
            consultationType: consultType,
            scheduledDate: selectedDate,
            scheduledTime: selectedTime,
            reason,
            serviceName: selectedService?.serviceName,
            servicePrice: selectedService?.defaultPrice,
          }
        : {
            providerUserId: selectedProvider.id,
            providerType: selectedRole?.role,
            scheduledDate: selectedDate,
            scheduledTime: selectedTime,
            type: consultType,
            reason,
            serviceName: selectedService?.serviceName,
            servicePrice: selectedService?.defaultPrice,
            specialty: selectedProvider.specializations?.[0],
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success || json.booking) {
        onCreated()
        onClose()
        resetForm()
      } else {
        setError(json.message || 'Failed to create booking')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedRole(null)
    setSelectedProvider(null)
    setSelectedService(null)
    setSelectedDate('')
    setSelectedTime('')
    setReason('')
    setError(null)
  }

  if (!isOpen) return null

  // Get tomorrow as min date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">Book an Appointment</h3>
          <button onClick={() => { onClose(); resetForm() }} className="p-2 text-gray-400 hover:text-gray-600"><FaTimes /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-2">
            {[1,2,3,4,5].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>

          {/* Step 1: Choose provider type */}
          {step === 1 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">What type of provider?</h4>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <button key={r.role} onClick={() => { setSelectedRole(r); setStep(2) }}
                    className="p-3 border rounded-xl text-left hover:border-blue-300 hover:bg-blue-50 transition">
                    <p className="font-medium text-sm text-gray-900">{r.label}</p>
                    <p className="text-[10px] text-gray-400">{r.providerCount} available</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Choose provider */}
          {step === 2 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Choose a {selectedRole?.label}</h4>
              {loading ? <div className="flex justify-center py-8"><FaSpinner className="animate-spin text-blue-500" /></div> : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {providers.map(p => (
                    <button key={p.id} onClick={() => { setSelectedProvider(p); setStep(3) }}
                      className="w-full p-3 border rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{p.firstName} {p.lastName}</p>
                        {p.specializations.length > 0 && <p className="text-[10px] text-gray-500">{p.specializations.join(', ')}</p>}
                        {p.address && <p className="text-[10px] text-gray-400">{p.address}</p>}
                      </div>
                    </button>
                  ))}
                  {providers.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">No providers found</p>}
                </div>
              )}
              <button onClick={() => setStep(1)} className="mt-2 text-xs text-blue-600 hover:underline">Back</button>
            </div>
          )}

          {/* Step 3: Choose service + type */}
          {step === 3 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Choose service & type</h4>
              {services.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                  {services.map(s => (
                    <button key={s.id || s.serviceName} onClick={() => setSelectedService(s)}
                      className={`w-full p-2 border rounded-lg text-left text-sm transition ${selectedService?.serviceName === s.serviceName ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">{s.serviceName}</span>
                        <span className="text-gray-500">Rs {(s.defaultPrice ?? 0).toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(['in_person', 'home_visit', 'video'] as const).map(t => (
                  <button key={t} onClick={() => setConsultType(t)}
                    className={`p-2 border rounded-lg text-xs font-medium transition ${consultType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {t === 'in_person' ? 'At Office' : t === 'home_visit' ? 'At Home' : 'Video Call'}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(4)} disabled={!selectedService && services.length > 0}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Continue</button>
              <button onClick={() => setStep(2)} className="mt-2 text-xs text-blue-600 hover:underline block">Back</button>
            </div>
          )}

          {/* Step 4: Choose date & time */}
          {step === 4 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Choose date & time</h4>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                min={minDate} className="w-full px-3 py-2 border rounded-lg text-sm mb-3" />

              {selectedDate && slots.length > 0 && (
                <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto mb-3">
                  {slots.filter(s => s.available).map(s => (
                    <button key={s.time} onClick={() => setSelectedTime(s.time)}
                      className={`px-2 py-1.5 border rounded text-xs font-medium transition ${selectedTime === s.time ? 'border-blue-500 bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {s.time}
                    </button>
                  ))}
                </div>
              )}

              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for visit (optional)"
                className="w-full px-3 py-2 border rounded-lg text-sm mb-3" rows={2} />

              <button onClick={() => setStep(5)} disabled={!selectedDate || !selectedTime}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">Review</button>
              <button onClick={() => setStep(3)} className="mt-2 text-xs text-blue-600 hover:underline block">Back</button>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Confirm Booking</h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm mb-3">
                <div className="flex justify-between"><span className="text-gray-500">Provider</span><span className="font-medium">{selectedProvider?.firstName} {selectedProvider?.lastName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium">{selectedService?.serviceName || 'General'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{consultType === 'in_person' ? 'At Office' : consultType === 'home_visit' ? 'At Home' : 'Video Call'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{selectedDate}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{selectedTime}</span></div>
                {selectedService?.defaultPrice != null && (
                  <div className="flex justify-between border-t pt-2"><span className="text-gray-500">Price</span><span className="font-bold">Rs {(selectedService.defaultPrice ?? 0).toLocaleString()}</span></div>
                )}
              </div>
              {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <FaSpinner className="animate-spin" /> : <FaCalendarAlt />}
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
              <button onClick={() => setStep(4)} className="mt-2 text-xs text-blue-600 hover:underline block">Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
