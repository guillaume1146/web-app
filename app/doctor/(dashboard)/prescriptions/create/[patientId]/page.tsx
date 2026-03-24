'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import {
 FaArrowLeft,
 FaPlus,
 FaTrash,
 FaPills,
 FaUser,
 FaSpinner,
 FaCheckCircle,
} from 'react-icons/fa'
import { useDoctorData } from '../../../context'

interface Medicine {
 name: string
 dosage: string
 frequency: string
 duration: string
 instructions: string
 quantity: number
}

interface PatientInfo {
 firstName: string
 lastName: string
 email: string
}

const EMPTY_MEDICINE: Medicine = {
 name: '',
 dosage: '',
 frequency: '',
 duration: '',
 instructions: '',
 quantity: 0,
}

export default function CreatePrescriptionPage() {
 const params = useParams()
 const searchParams = useSearchParams()
 const router = useRouter()
 const doctor = useDoctorData()

 const patientId = params.patientId as string
 const roomId = searchParams.get('roomId') || ''

 const [patient, setPatient] = useState<PatientInfo | null>(null)
 const [patientLoading, setPatientLoading] = useState(true)

 const [diagnosis, setDiagnosis] = useState('')
 const [notes, setNotes] = useState('')
 const [medicines, setMedicines] = useState<Medicine[]>([{ ...EMPTY_MEDICINE }])

 const [submitting, setSubmitting] = useState(false)
 const [submitError, setSubmitError] = useState('')
 const [submitSuccess, setSubmitSuccess] = useState(false)

 // Pre-fill notes from consultation session if available
 useEffect(() => {
 if (roomId) {
 try {
 const saved = localStorage.getItem(`consultation_notes_${roomId}`)
 if (saved) {
 const parsed = JSON.parse(saved) as { notes?: string }
 if (parsed.notes) setNotes(parsed.notes)
 }
 } catch {
 // Ignore corrupted localStorage
 }
 }
 }, [roomId])

 // Fetch patient info
 const fetchPatient = useCallback(async () => {
 try {
 const res = await fetch(`/api/users/${patientId}`)
 if (res.ok) {
 const json = await res.json()
 if (json.success && json.data) {
 setPatient({
 firstName: json.data.firstName,
 lastName: json.data.lastName,
 email: json.data.email,
 })
 }
 }
 } catch {
 // Patient info is non-critical — proceed without it
 } finally {
 setPatientLoading(false)
 }
 }, [patientId])

 useEffect(() => {
 fetchPatient()
 }, [fetchPatient])

 const addMedicine = () => setMedicines((prev) => [...prev, { ...EMPTY_MEDICINE }])

 const removeMedicine = (index: number) =>
 setMedicines((prev) => prev.filter((_, i) => i !== index))

 const updateMedicine = (index: number, field: keyof Medicine, value: string | number) =>
 setMedicines((prev) => {
 const updated = [...prev]
 updated[index] = { ...updated[index], [field]: value }
 return updated
 })

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setSubmitError('')

 if (!diagnosis.trim()) {
 setSubmitError('Please enter a diagnosis.')
 return
 }
 const filledMedicines = medicines.filter((m) => m.name.trim())
 if (filledMedicines.length === 0) {
 setSubmitError('Please add at least one medicine.')
 return
 }

 setSubmitting(true)
 try {
 const res = await fetch(`/api/doctors/${doctor.id}/prescriptions`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 patientId,
 diagnosis: diagnosis.trim(),
 notes: notes.trim() || undefined,
 medicines: filledMedicines,
 }),
 })
 const json = await res.json()
 if (!res.ok || !json.success) {
 throw new Error(json.message || 'Failed to create prescription')
 }

 setSubmitSuccess(true)

 // Redirect after a brief success display
 setTimeout(() => {
 if (roomId) {
 router.push(`/doctor/video?roomId=${roomId}`)
 } else {
 router.push('/doctor/prescriptions')
 }
 }, 1500)
 } catch (error) {
 setSubmitError(error instanceof Error ? error.message : 'Failed to create prescription')
 } finally {
 setSubmitting(false)
 }
 }

 const handleBack = () => {
 if (roomId) {
 router.push(`/doctor/video?roomId=${roomId}`)
 } else {
 router.push('/doctor/prescriptions')
 }
 }

 return (
 <div className="max-w-3xl mx-auto space-y-6">
 {/* Page Header */}
 <div className="flex items-center gap-4">
 <button
 onClick={handleBack}
 className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
 aria-label="Go back"
 >
 <FaArrowLeft />
 </button>
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Write Prescription</h1>
 {roomId && (
 <p className="text-sm text-gray-500 mt-0.5">
 Linked to consultation room <span className="font-mono text-gray-700">{roomId}</span>
 </p>
 )}
 </div>
 </div>

 {/* Patient Card */}
 <div className="bg-white rounded-2xl p-5 border border-blue-200 flex items-center gap-4">
 <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl flex-shrink-0">
 <FaUser />
 </div>
 <div>
 <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">Patient</p>
 {patientLoading ? (
 <div className="flex items-center gap-2 text-gray-500">
 <FaSpinner className="animate-spin text-sm" />
 <span className="text-sm">Loading patient info…</span>
 </div>
 ) : patient ? (
 <>
 <h2 className="text-lg font-bold text-gray-900">
 {patient.firstName} {patient.lastName}
 </h2>
 <p className="text-sm text-gray-500">{patient.email}</p>
 </>
 ) : (
 <p className="text-sm text-gray-600">Patient ID: {patientId}</p>
 )}
 </div>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Error / Success Banners */}
 {submitError && (
 <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
 {submitError}
 </div>
 )}
 {submitSuccess && (
 <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
 <FaCheckCircle />
 Prescription created successfully! Redirecting…
 </div>
 )}

 {/* Diagnosis */}
 <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
 <label className="block text-sm font-semibold text-gray-700 mb-2">
 Diagnosis <span className="text-red-500">*</span>
 </label>
 <textarea
 value={diagnosis}
 onChange={(e) => setDiagnosis(e.target.value)}
 rows={3}
 placeholder="Enter the diagnosis or clinical indication…"
 className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm resize-none"
 required
 />
 </div>

 {/* Medicines */}
 <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-semibold text-gray-700">
 Medicines <span className="text-red-500">*</span>
 </h2>
 <button
 type="button"
 onClick={addMedicine}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition"
 >
 <FaPlus />
 Add Medicine
 </button>
 </div>

 {medicines.map((med, index) => (
 <div
 key={index}
 className="bg-white/30 rounded-xl p-4 border border-gray-200 space-y-3"
 >
 <div className="flex items-center justify-between mb-1">
 <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
 <FaPills className="text-blue-500" />
 Medicine {index + 1}
 </h3>
 {medicines.length > 1 && (
 <button
 type="button"
 onClick={() => removeMedicine(index)}
 className="text-red-400 hover:text-red-600 transition"
 aria-label={`Remove medicine ${index + 1}`}
 >
 <FaTrash />
 </button>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <input
 type="text"
 placeholder="Medicine name *"
 value={med.name}
 onChange={(e) => updateMedicine(index, 'name', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="text"
 placeholder="Dosage (e.g. 500mg)"
 value={med.dosage}
 onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="text"
 placeholder="Frequency (e.g. Twice daily)"
 value={med.frequency}
 onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="text"
 placeholder="Duration (e.g. 7 days)"
 value={med.duration}
 onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="number"
 placeholder="Quantity"
 value={med.quantity || ''}
 onChange={(e) => updateMedicine(index, 'quantity', parseInt(e.target.value, 10) || 0)}
 min={0}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="text"
 placeholder="Instructions (e.g. Take after meals)"
 value={med.instructions}
 onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 </div>
 </div>
 ))}
 </div>

 {/* Notes */}
 <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
 <label className="block text-sm font-semibold text-gray-700 mb-2">
 Additional Notes
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={4}
 placeholder="Additional instructions, follow-up advice, or consultation notes…"
 className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm resize-none"
 />
 </div>

 {/* Actions */}
 <div className="flex flex-col sm:flex-row gap-3">
 <button
 type="button"
 onClick={handleBack}
 className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition text-sm"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={submitting || submitSuccess}
 className="flex-1 px-6 py-3 bg-white transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {submitting ? (
 <>
 <FaSpinner className="animate-spin" />
 Creating…
 </>
 ) : submitSuccess ? (
 <>
 <FaCheckCircle />
 Created!
 </>
 ) : (
 'Create Prescription'
 )}
 </button>
 </div>
 </form>
 </div>
 )
}
