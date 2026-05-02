'use client'

import { useState, useMemo } from 'react'
import WeeklySlotPicker from '@/components/booking/WeeklySlotPicker'
import {
 FaHospital,
 FaHome,
 FaVideo,
 FaCalendarAlt,
 FaClock,
 FaWallet,
 FaArrowLeft,
 FaArrowRight,
 FaCheck,
 FaSpinner,
} from 'react-icons/fa'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface BookingSubmitData {
 consultationType?: 'in_person' | 'home_visit' | 'video'
 scheduledDate: string
 scheduledTime: string
 reason: string
 notes?: string
 duration?: number
 serviceId?: string
 // Lab-specific
 testName?: string
 sampleType?: string
 // Emergency-specific
 emergencyType?: string
 location?: string
 contactNumber?: string
 priority?: string
 // Childcare
 children?: string[]
}

interface ServiceOption {
 id: string
 serviceName: string
 category: string
 description: string
 price: number
 duration?: number
}

interface ProviderCapabilities {
 homeVisitAvailable?: boolean
 telemedicineAvailable?: boolean
}

interface BookingFormProps {
 providerType: 'doctor' | 'nurse' | 'nanny' | 'lab-test' | 'emergency'
 providerId?: string // profile ID for availability check
 providerName?: string
 providerSpecialty?: string
 providerImage?: string
 providerLocation?: string
 showConsultationType?: boolean // true for doctor/nurse/nanny
 price?: number // consultation fee
 services?: ServiceOption[] // provider's service catalog
 providerCapabilities?: ProviderCapabilities // filter consultation types based on provider settings
 onSubmit: (data: BookingSubmitData) => Promise<void>
 isSubmitting?: boolean
 walletBalance?: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const CONSULTATION_TYPES = [
 {
 value: 'in_person' as const,
 label: 'In-Person',
 description: 'Visit at the clinic or hospital',
 icon: FaHospital,
 color: 'blue',
 },
 {
 value: 'home_visit' as const,
 label: 'Home Visit',
 description: 'Provider comes to your location',
 icon: FaHome,
 color: 'teal',
 },
 {
 value: 'video' as const,
 label: 'Video Call',
 description: 'Secure online video consultation',
 icon: FaVideo,
 color: 'green',
 },
]

// Intentionally static — standard emergency classification categories
const EMERGENCY_TYPES = [
 'Medical',
 'Accident',
 'Fire',
 'Natural Disaster',
 'Other',
]

// Intentionally static — standard triage priority levels used across all emergency services
const PRIORITY_OPTIONS = [
 { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50 border-green-200' },
 { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
 { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50 border-orange-200' },
 { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50 border-red-200' },
]

const DURATION_OPTIONS = [
 { value: 30, label: '30 minutes' },
 { value: 60, label: '1 hour' },
 { value: 90, label: '1 hour 30 min' },
 { value: 120, label: '2 hours' },
]

// Pre-set time slots shown for emergency bookings (no provider ID / slot API)
const EMERGENCY_TIME_SLOTS = [
 { value: 'next_available', label: 'Next Available', description: 'Dispatch immediately' },
 { value: 'within_30min', label: 'Within 30 min', description: 'Arrive in ~30 minutes' },
 { value: 'within_1hr', label: 'Within 1 hour', description: 'Arrive in ~1 hour' },
 { value: 'within_2hrs', label: 'Within 2 hours', description: 'Arrive in ~2 hours' },
]

// Quick lookup map used by formatTime to pretty-print emergency slot values
const EMERGENCY_TIME_SLOTS_MAP: Record<string, string> = Object.fromEntries(
 EMERGENCY_TIME_SLOTS.map((s) => [s.value, s.label])
)

function getInitials(name: string): string {
 return name
 .split(' ')
 .map((n) => n[0])
 .join('')
 .toUpperCase()
 .slice(0, 2)
}

function todayISO(): string {
 return new Date().toISOString().split('T')[0]
}

function formatDate(dateString: string): string {
 if (!dateString) return 'Not selected'
 return new Date(dateString).toLocaleDateString('en-US', {
 weekday: 'long',
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 })
}

function formatTime(timeString: string): string {
 if (!timeString) return 'Not selected'
 // Emergency preset slot labels
 const emergencySlot = EMERGENCY_TIME_SLOTS_MAP[timeString]
 if (emergencySlot) return emergencySlot
 // Standard HH:MM time
 const [hours, minutes] = timeString.split(':')
 const h = parseInt(hours, 10)
 if (isNaN(h)) return timeString
 const amPm = h >= 12 ? 'PM' : 'AM'
 const displayHour = h % 12 || 12
 return `${displayHour}:${minutes} ${amPm}`
}

function getProviderLabel(type: BookingFormProps['providerType']): string {
 switch (type) {
 case 'doctor':
 return 'Doctor'
 case 'nurse':
 return 'Nurse'
 case 'nanny':
 return 'Nanny / Childcare'
 case 'lab-test':
 return 'Lab Test'
 case 'emergency':
 return 'Emergency Service'
 }
}

function getStepLabels(providerType: BookingFormProps['providerType']): string[] {
 switch (providerType) {
 case 'doctor':
 case 'nurse':
 case 'nanny':
 return ['Consultation Type', 'Schedule', 'Review & Submit']
 case 'lab-test':
 return ['Test Details', 'Schedule', 'Review & Submit']
 case 'emergency':
 return ['Emergency Details', 'Schedule', 'Review & Submit']
 }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function BookingForm({
 providerType,
 providerId,
 providerName,
 providerSpecialty,
 providerImage,
 providerLocation,
 showConsultationType,
 price,
 services,
 providerCapabilities,
 onSubmit,
 isSubmitting = false,
 walletBalance,
}: BookingFormProps) {
 // Filter consultation types based on provider capabilities.
 // If providerCapabilities is not provided, all types are shown (backward compatible).
 const availableConsultationTypes = useMemo(() => {
  if (!providerCapabilities) return CONSULTATION_TYPES
  return CONSULTATION_TYPES.filter((ct) => {
   if (ct.value === 'home_visit' && providerCapabilities.homeVisitAvailable === false) return false
   if (ct.value === 'video' && providerCapabilities.telemedicineAvailable === false) return false
   return true
  })
 }, [providerCapabilities])

 const [step, setStep] = useState(1)

 // Form state
 const [consultationType, setConsultationType] = useState<
 'in_person' | 'home_visit' | 'video' | undefined
 >(undefined)
 const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined)
 const selectedService = services?.find(s => s.id === selectedServiceId)
 const displayPrice = selectedService?.price ?? price
 const [scheduledDate, setScheduledDate] = useState(providerType === 'emergency' ? todayISO() : '')
 const [scheduledTime, setScheduledTime] = useState('')
 const [reason, setReason] = useState('')
 const [notes, setNotes] = useState('')
 const [duration, setDuration] = useState(30)

 // Lab-specific
 const [testName, setTestName] = useState('')
 const [sampleType, setSampleType] = useState('')

 // Emergency-specific
 const [emergencyType, setEmergencyType] = useState('')
 const [location, setLocation] = useState('')
 const [contactNumber, setContactNumber] = useState('')
 const [priority, setPriority] = useState('medium')

 const useSlotPicker = providerType !== 'emergency' && !!providerId
 const useEmergencySlots = providerType === 'emergency'

 const totalSteps = 3
 const stepLabels = getStepLabels(providerType)

 const isReasonRequired = providerType === 'doctor' || providerType === 'nurse'

 // ── Validation ──────────────────────────────────────────────────────────────

 const canAdvanceStep1 = useMemo(() => {
 switch (providerType) {
 case 'doctor':
 case 'nurse':
 case 'nanny':
 return !!consultationType
 case 'lab-test':
 return testName.trim().length > 0 && sampleType.trim().length > 0
 case 'emergency':
 return (
 emergencyType.trim().length > 0 &&
 location.trim().length > 0 &&
 contactNumber.trim().length > 0
 )
 }
 }, [providerType, consultationType, testName, sampleType, emergencyType, location, contactNumber])

 const canAdvanceStep2 = useMemo(() => {
 const hasDate = scheduledDate.length > 0
 const hasTime = scheduledTime.length > 0
 const hasReason = !isReasonRequired || reason.trim().length > 0
 return hasDate && hasTime && hasReason
 }, [scheduledDate, scheduledTime, reason, isReasonRequired])

 // Helper text shown below the "Next" button when it is disabled
 const stepHint = useMemo(() => {
 if (step === 1 && !canAdvanceStep1) {
 switch (providerType) {
 case 'doctor':
 case 'nurse':
 case 'nanny':
 return 'Please select a consultation type'
 case 'lab-test': {
 const missing: string[] = []
 if (!testName.trim()) missing.push('test name')
 if (!sampleType.trim()) missing.push('sample type')
 return `Please enter ${missing.join(' and ')}`
 }
 case 'emergency': {
 const missing: string[] = []
 if (!emergencyType.trim()) missing.push('emergency type')
 if (!location.trim()) missing.push('location')
 if (!contactNumber.trim()) missing.push('contact number')
 return `Please provide ${missing.join(', ')}`
 }
 }
 }
 if (step === 2 && !canAdvanceStep2) {
 const missing: string[] = []
 if (!scheduledDate) missing.push('a date')
 if (!scheduledTime) missing.push('a time')
 if (isReasonRequired && !reason.trim()) missing.push('a reason for visit')
 return `Please select ${missing.join(' and ')}`
 }
 return null
 }, [step, canAdvanceStep1, canAdvanceStep2, providerType, consultationType, testName, sampleType, emergencyType, location, contactNumber, scheduledDate, scheduledTime, reason, isReasonRequired])

 // ── Build submit data ───────────────────────────────────────────────────────

 function buildSubmitData(): BookingSubmitData {
 const data: BookingSubmitData = {
 scheduledDate,
 scheduledTime,
 reason,
 ...(notes ? { notes } : {}),
 duration: selectedService?.duration ?? duration,
 serviceId: selectedServiceId,
 }
 if (showConsultationType || providerType === 'doctor' || providerType === 'nurse' || providerType === 'nanny') {
 data.consultationType = consultationType
 }
 if (providerType === 'lab-test') {
 data.testName = testName
 data.sampleType = sampleType
 }
 if (providerType === 'emergency') {
 data.emergencyType = emergencyType
 data.location = location
 data.contactNumber = contactNumber
 data.priority = priority
 }
 return data
 }

 const [submitError, setSubmitError] = useState('')

 async function handleSubmit() {
 setSubmitError('')
 try {
 await onSubmit(buildSubmitData())
 } catch (err) {
 setSubmitError(err instanceof Error ? err.message : 'Booking failed. Please try again.')
 }
 }

 // ── Navigation ──────────────────────────────────────────────────────────────

 function goNext() {
 if (step < totalSteps) setStep(step + 1)
 }

 function goBack() {
 if (step > 1) setStep(step - 1)
 }

 // ── Render helpers ──────────────────────────────────────────────────────────

 const colorMap: Record<string, { ring: string; bg: string; text: string; border: string }> = {
 blue: { ring: 'ring-blue-600', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-600' },
 teal: { ring: 'ring-teal-600', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-600' },
 green: { ring: 'ring-green-600', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-600' },
 }

 // ── JSX ─────────────────────────────────────────────────────────────────────

 return (
 <div className="space-y-6">
 {/* ── Provider Info Card ─────────────────────────────────────────────── */}
 {providerName && (
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
 <div className="flex items-center gap-4">
 {/* Avatar / initials */}
 {providerImage ? (
 <img
 src={providerImage}
 alt={providerName}
 className="w-16 h-16 rounded-full object-cover border-2 border-blue-100"
 />
 ) : (
 <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold">
 {getInitials(providerName)}
 </div>
 )}

 <div className="flex-1 min-w-0">
 <h3 className="text-lg font-bold text-gray-900 truncate">{providerName}</h3>
 {providerSpecialty && (
 <p className="text-sm text-blue-600 font-medium">{providerSpecialty}</p>
 )}
 {providerLocation && (
 <p className="text-sm text-gray-500 truncate">{providerLocation}</p>
 )}
 </div>

 {displayPrice !== undefined && displayPrice > 0 && (
 <div className="text-right flex-shrink-0">
 <p className="text-xs text-gray-500 uppercase tracking-wide">Fee</p>
 <p className="text-lg font-bold text-green-600">Rs {displayPrice.toLocaleString()}</p>
 {selectedService && (
 <p className="text-xs text-gray-400">{selectedService.serviceName}</p>
 )}
 </div>
 )}
 </div>
 </div>
 )}

 {/* ── Step Indicator ────────────────────────────────────────────────── */}
 <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
 <div className="flex items-center justify-between max-w-lg mx-auto">
 {stepLabels.map((label, index) => {
 const stepNum = index + 1
 const isCompleted = step > stepNum
 const isCurrent = step === stepNum
 return (
 <div key={label} className="flex items-center">
 <div className="flex flex-col items-center">
 <div
 className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
 isCompleted
 ? 'bg-green-500 text-white'
 : isCurrent
 ? 'bg-blue-600 text-white'
 : 'bg-gray-200 text-gray-500'
 }`}
 >
 {isCompleted ? <FaCheck className="text-sm" /> : stepNum}
 </div>
 <span
 className={`text-xs mt-1.5 text-center whitespace-nowrap ${
 isCurrent ? 'text-blue-600 font-semibold' : isCompleted ? 'text-green-600 font-medium' : 'text-gray-400'
 }`}
 >
 {label}
 </span>
 </div>
 {index < stepLabels.length - 1 && (
 <div
 className={`w-12 sm:w-20 h-0.5 mx-2 transition-colors ${
 isCompleted ? 'bg-green-500' : 'bg-gray-200'
 }`}
 />
 )}
 </div>
 )
 })}
 </div>
 </div>

 {/* ── Step 1 ────────────────────────────────────────────────────────── */}
 {step === 1 && (
 <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
 <h2 className="text-xl font-bold text-gray-900 mb-6">
 {providerType === 'lab-test'
 ? 'Test Details'
 : providerType === 'emergency'
 ? 'Emergency Details'
 : 'Select Consultation Type'}
 </h2>

 {/* Doctor / Nurse / Nanny — consultation type cards */}
 {(providerType === 'doctor' || providerType === 'nurse' || providerType === 'nanny') && (
 <div className="grid sm:grid-cols-3 gap-4">
 {availableConsultationTypes.map((ct) => {
 const isSelected = consultationType === ct.value
 const colors = colorMap[ct.color]
 const Icon = ct.icon
 return (
 <button
 key={ct.value}
 type="button"
 onClick={() => setConsultationType(ct.value)}
 className={`relative flex flex-col items-center p-6 rounded-xl border-2 transition-all cursor-pointer ${
 isSelected
 ? `${colors.border} ${colors.bg} ring-2 ${colors.ring} ring-offset-1`
 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
 }`}
 >
 <div
 className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
 isSelected ? colors.bg : 'bg-gray-100'
 }`}
 >
 <Icon
 className={`text-2xl ${isSelected ? colors.text : 'text-gray-400'}`}
 />
 </div>
 <span
 className={`font-semibold text-sm ${
 isSelected ? colors.text : 'text-gray-700'
 }`}
 >
 {ct.label}
 </span>
 <span className="text-xs text-gray-500 mt-1 text-center">{ct.description}</span>

 {/* Radio dot */}
 <div
 className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
 isSelected ? `${colors.border}` : 'border-gray-300'
 }`}
 >
 {isSelected && (
 <div className={`w-2.5 h-2.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
 )}
 </div>
 </button>
 )
 })}
 </div>
 )}

 {/* Service selection (when provider has a service catalog) */}
 {services && services.length > 0 && (providerType === 'doctor' || providerType === 'nurse' || providerType === 'nanny') && (
 <div className={consultationType ? 'mt-6' : ''}>
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Select a Service (optional)</h3>
 <div className="grid sm:grid-cols-2 gap-3">
 {services.map((svc) => {
 const isSelected = selectedServiceId === svc.id
 return (
 <button
 key={svc.id}
 type="button"
 onClick={() => setSelectedServiceId(isSelected ? undefined : svc.id)}
 className={`text-left p-4 rounded-xl border-2 transition-all ${
 isSelected
 ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-1'
 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
 }`}
 >
 <div className="flex justify-between items-start gap-2">
 <div className="min-w-0">
 <p className={`font-semibold text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
 {svc.serviceName}
 </p>
 <p className="text-xs text-gray-500 mt-0.5">{svc.category}</p>
 {svc.description && (
 <p className="text-xs text-gray-400 mt-1 line-clamp-2">{svc.description}</p>
 )}
 </div>
 <div className="flex-shrink-0 text-right">
 <p className={`font-bold text-sm ${isSelected ? 'text-green-600' : 'text-gray-700'}`}>
 Rs {(svc.price ?? 0).toLocaleString()}
 </p>
 {svc.duration && (
 <p className="text-xs text-gray-400">{svc.duration} min</p>
 )}
 </div>
 </div>
 </button>
 )
 })}
 </div>
 </div>
 )}

 {/* Lab-test — test name and sample type inputs */}
 {providerType === 'lab-test' && (
 <div className="space-y-5">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Test Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={testName}
 onChange={(e) => setTestName(e.target.value)}
 placeholder="e.g. Complete Blood Count, Lipid Panel"
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Sample Type <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={sampleType}
 onChange={(e) => setSampleType(e.target.value)}
 placeholder="e.g. Blood, Urine, Saliva"
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors"
 />
 </div>
 </div>
 )}

 {/* Emergency — emergency type, location, contact, priority */}
 {providerType === 'emergency' && (
 <div className="space-y-5">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Emergency Type <span className="text-red-500">*</span>
 </label>
 <select
 value={emergencyType}
 onChange={(e) => setEmergencyType(e.target.value)}
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors bg-white"
 >
 <option value="">Select emergency type</option>
 {EMERGENCY_TYPES.map((type) => (
 <option key={type} value={type}>
 {type}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Location <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={location}
 onChange={(e) => setLocation(e.target.value)}
 placeholder="Full address or landmark"
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Contact Number <span className="text-red-500">*</span>
 </label>
 <input
 type="tel"
 value={contactNumber}
 onChange={(e) => setContactNumber(e.target.value)}
 placeholder="+230 5XXX XXXX"
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-3">Priority</label>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {PRIORITY_OPTIONS.map((opt) => (
 <button
 key={opt.value}
 type="button"
 onClick={() => setPriority(opt.value)}
 className={`px-4 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
 priority === opt.value
 ? opt.color + ' ring-2 ring-offset-1'
 : 'border-gray-200 text-gray-600 hover:bg-gray-50'
 }`}
 >
 {opt.label}
 </button>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {/* ── Step 2 — Schedule ─────────────────────────────────────────────── */}
 {step === 2 && (
 <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
 <h2 className="text-xl font-bold text-gray-900 mb-6">Schedule Appointment</h2>

 <div className="space-y-6">
 {/* Weekly Slot Picker or Emergency Slots */}
 <div>
 <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
 <FaClock className="text-teal-600" />
 {useEmergencySlots ? 'Response Time' : 'Select a Time Slot'} <span className="text-red-500">*</span>
 </label>

 {useSlotPicker && providerId ? (
 <WeeklySlotPicker
 providerId={providerId}
 providerType={providerType as 'doctor' | 'nurse' | 'nanny' | 'lab-test'}
 onSelect={(date, time) => { setScheduledDate(date); setScheduledTime(time) }}
 selectedDate={scheduledDate}
 selectedTime={scheduledTime}
 accentColor="blue"
 />
 ) : useEmergencySlots ? (
 <>
 <div className="mb-4">
 <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
 <FaCalendarAlt className="text-blue-600" />
 Date
 </label>
 <input
 type="date"
 value={scheduledDate}
 onChange={(e) => setScheduledDate(e.target.value)}
 min={todayISO()}
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors"
 />
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {EMERGENCY_TIME_SLOTS.map((slot) => (
 <button
 key={slot.value}
 type="button"
 onClick={() => setScheduledTime(slot.value)}
 className={`flex flex-col items-center p-4 border-2 rounded-xl text-sm font-medium transition-all ${
 scheduledTime === slot.value
 ? 'bg-red-600 text-white border-red-600 shadow-md'
 : 'border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50'
 }`}
 >
 <span className="font-semibold">{slot.label}</span>
 <span className={`text-xs mt-0.5 ${scheduledTime === slot.value ? 'text-red-100' : 'text-gray-400'}`}>
 {slot.description}
 </span>
 </button>
 ))}
 </div>
 </>
 ) : (
 <div className="grid sm:grid-cols-2 gap-4">
 <div>
 <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
 <FaCalendarAlt className="text-blue-600" />
 Date
 </label>
 <input
 type="date"
 value={scheduledDate}
 onChange={(e) => setScheduledDate(e.target.value)}
 min={todayISO()}
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors"
 />
 </div>
 <div>
 <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
 <FaClock className="text-teal-600" />
 Time
 </label>
 <input
 type="time"
 value={scheduledTime}
 onChange={(e) => setScheduledTime(e.target.value)}
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors"
 />
 </div>
 </div>
 )}
 </div>

 {/* Reason */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Reason for Visit{isReasonRequired && <span className="text-red-500"> *</span>}
 </label>
 <textarea
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 rows={3}
 placeholder={
 providerType === 'doctor'
 ? 'Describe your symptoms or reason for consultation...'
 : providerType === 'nurse'
 ? 'Describe the care you need...'
 : providerType === 'nanny'
 ? 'Describe childcare requirements (optional)...'
 : providerType === 'lab-test'
 ? 'Any additional context for the lab test (optional)...'
 : 'Describe the situation (optional)...'
 }
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors resize-none"
 />
 </div>
 </div>
 </div>
 )}

 {/* ── Step 3 — Review & Submit ──────────────────────────────────────── */}
 {step === 3 && (
 <div className="space-y-6">
 {/* Summary card */}
 <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
 <h2 className="text-xl font-bold text-gray-900 mb-6">Review Booking</h2>

 <div className=" rounded-xl p-5 border border-blue-100">
 <div className="grid sm:grid-cols-2 gap-4 text-sm">
 {/* Provider */}
 {providerName && (
 <div>
 <span className="text-gray-500">{getProviderLabel(providerType)}</span>
 <p className="font-semibold text-gray-900">{providerName}</p>
 </div>
 )}

 {/* Consultation type (doctor/nurse/nanny) */}
 {consultationType && (
 <div>
 <span className="text-gray-500">Consultation Type</span>
 <p className="font-semibold text-gray-900">
 {consultationType === 'in_person'
 ? 'In-Person'
 : consultationType === 'home_visit'
 ? 'Home Visit'
 : 'Video Call'}
 </p>
 </div>
 )}

 {/* Lab details */}
 {providerType === 'lab-test' && (
 <>
 <div>
 <span className="text-gray-500">Test Name</span>
 <p className="font-semibold text-gray-900">{testName}</p>
 </div>
 <div>
 <span className="text-gray-500">Sample Type</span>
 <p className="font-semibold text-gray-900">{sampleType}</p>
 </div>
 </>
 )}

 {/* Emergency details */}
 {providerType === 'emergency' && (
 <>
 <div>
 <span className="text-gray-500">Emergency Type</span>
 <p className="font-semibold text-gray-900">{emergencyType}</p>
 </div>
 <div>
 <span className="text-gray-500">Location</span>
 <p className="font-semibold text-gray-900">{location}</p>
 </div>
 <div>
 <span className="text-gray-500">Contact Number</span>
 <p className="font-semibold text-gray-900">{contactNumber}</p>
 </div>
 <div>
 <span className="text-gray-500">Priority</span>
 <p className="font-semibold text-gray-900 capitalize">{priority}</p>
 </div>
 </>
 )}

 {/* Schedule */}
 <div>
 <span className="text-gray-500">Date</span>
 <p className="font-semibold text-gray-900">{formatDate(scheduledDate)}</p>
 </div>
 <div>
 <span className="text-gray-500">Time</span>
 <p className="font-semibold text-gray-900">{formatTime(scheduledTime)}</p>
 </div>
 <div>
 <span className="text-gray-500">Duration</span>
 <p className="font-semibold text-gray-900">
 {DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? `${duration} min`}
 </p>
 </div>

 {/* Reason */}
 {reason && (
 <div className="sm:col-span-2">
 <span className="text-gray-500">Reason</span>
 <p className="font-semibold text-gray-900">{reason}</p>
 </div>
 )}

 {/* Service */}
 {selectedService && (
 <div>
 <span className="text-gray-500">Service</span>
 <p className="font-semibold text-gray-900">{selectedService.serviceName}</p>
 </div>
 )}

 {/* Fee */}
 {displayPrice !== undefined && displayPrice > 0 && (
 <div>
 <span className="text-gray-500">Consultation Fee</span>
 <p className="font-bold text-green-600 text-base">
 Rs {displayPrice.toLocaleString()}
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Wallet balance */}
 {walletBalance !== undefined && (
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
 <div className="flex items-center gap-3 mb-3">
 <FaWallet className="text-blue-600 text-lg" />
 <h3 className="font-semibold text-gray-900">Wallet</h3>
 </div>
 <p className="text-gray-700">
 Your trial balance:{' '}
 <span className="font-bold text-blue-600">Rs {walletBalance.toLocaleString()}</span>
 </p>
 {displayPrice !== undefined && displayPrice > 0 && walletBalance < displayPrice && (
 <div className="mt-3 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
 <span className="text-yellow-600 font-bold text-lg leading-none">!</span>
 <p className="text-sm text-yellow-800">
 Your wallet balance (Rs {walletBalance.toLocaleString()}) is less than the
 consultation fee (Rs {displayPrice.toLocaleString()}). You may not be able to complete
 this booking.
 </p>
 </div>
 )}
 </div>
 )}

 {/* Notes */}
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
 <label className="block text-sm font-medium text-gray-700 mb-2">
 Additional Notes (optional)
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={3}
 placeholder="Any additional information for the provider..."
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-colors resize-none"
 />
 </div>
 </div>
 )}

 {/* ── Submission Error ──────────────────────────────────────────────── */}
 {submitError && (
 <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
 <span className="text-red-500 text-lg font-bold leading-none mt-0.5">!</span>
 <div>
 <p className="text-red-800 font-medium text-sm">Booking Failed</p>
 <p className="text-red-700 text-sm mt-0.5">{submitError}</p>
 </div>
 </div>
 )}

 {/* ── Navigation Buttons ────────────────────────────────────────────── */}
 <div className="flex justify-between items-center">
 {step > 1 ? (
 <button
 type="button"
 onClick={goBack}
 className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
 >
 <FaArrowLeft className="text-sm" />
 Back
 </button>
 ) : (
 <div />
 )}

 {step < totalSteps ? (
 <div className="flex flex-col items-end">
 <button
 type="button"
 onClick={goNext}
 disabled={step === 1 ? !canAdvanceStep1 : !canAdvanceStep2}
 className="flex items-center gap-2 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Next
 <FaArrowRight className="text-sm" />
 </button>
 {stepHint && (
 <p className="text-xs text-amber-600 mt-1">{stepHint}</p>
 )}
 </div>
 ) : (
 <button
 type="button"
 onClick={handleSubmit}
 disabled={isSubmitting}
 className="flex items-center gap-2 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting ? (
 <>
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 Submitting...
 </>
 ) : (
 <>
 <FaCheck className="text-sm" />
 Confirm Booking
 </>
 )}
 </button>
 )}
 </div>
 </div>
 )
}
