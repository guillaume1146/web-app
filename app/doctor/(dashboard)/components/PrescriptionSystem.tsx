import React, { useState } from 'react'
import type { IconType } from 'react-icons'
import {
 FaPrescriptionBottle,
 FaPills,
 FaPlus,
 FaSearch,
 FaFilter,
 FaCalendarAlt,
 FaCheckCircle,
 FaEdit,
 FaTrash,
 FaPrint,
 FaDownload,
 FaHistory,
 FaChevronDown,
 FaChevronUp,
 FaFileAlt,
 FaClipboardList,
 FaSyringe,
 FaCapsules,
 FaTablets,
 FaHeartbeat,
 FaSignature,
 FaRedo,
 FaArchive
} from 'react-icons/fa'

/* ---------------- Types ---------------- */

interface Medicine {
 name: string
 dosage: string
 frequency: string
 duration: string
 instructions: string
 quantity: number
}

interface Prescription {
 id: string
 patientId: string
 patientName: string
 diagnosis: string
 medicines: Medicine[]
 date: string // ISO
 isActive: boolean
 nextRefill?: string
 notes?: string
 signatureUrl?: string
}

interface TemplateItem {
 id: string
 name: string
 condition: string
 medicines: string[]
}

interface Patient {
 id: string
 firstName: string
 lastName: string
}

interface DoctorData {
 firstName: string
 lastName: string
 prescriptions: Prescription[]
 prescriptionTemplates: TemplateItem[]
 patients: { current: Patient[] }
}

interface Props {
 doctorData: DoctorData
 onCreatePrescription?: (data: NewPrescription) => Promise<void>
 preselectedPatientId?: string
}

interface FilterOptions {
 status: 'all' | 'active' | 'inactive'
 patient: 'all' | string
 dateRange: 'all' | 'week' | 'month' | 'year'
}

interface NewPrescription {
 patientId: string
 diagnosis: string
 medicines: Medicine[]
 notes: string
}

/* ---------------- Component ---------------- */

const PrescriptionSystem: React.FC<Props> = ({ doctorData, onCreatePrescription, preselectedPatientId }) => {
 const [activeTab, setActiveTab] = useState<'active' | 'new' | 'templates' | 'history'>(
 preselectedPatientId ? 'new' : 'active'
 )
 const [searchQuery, setSearchQuery] = useState('')
 const [filters, setFilters] = useState<FilterOptions>({
 status: 'all',
 patient: 'all',
 dateRange: 'all'
 })
 const [expandedPrescription, setExpandedPrescription] = useState<string | null>(null)
 const [showFilters, setShowFilters] = useState(false)
 const [selectedTemplate, setSelectedTemplate] = useState<string>('')
 const [submitting, setSubmitting] = useState(false)
 const [submitError, setSubmitError] = useState('')
 const [submitSuccess, setSubmitSuccess] = useState('')

 const [newPrescription, setNewPrescription] = useState<NewPrescription>({
 patientId: preselectedPatientId || '',
 diagnosis: '',
 medicines: [
 {
 name: '',
 dosage: '',
 frequency: '',
 duration: '',
 instructions: '',
 quantity: 0
 }
 ],
 notes: ''
 })

 // Data from doctorData
 const prescriptions: Prescription[] = doctorData?.prescriptions ?? []
 const templates: TemplateItem[] = doctorData?.prescriptionTemplates ?? []
 const patients: Patient[] = doctorData?.patients?.current ?? []

 const addMedicine = () => {
 setNewPrescription((prev) => ({
 ...prev,
 medicines: [
 ...prev.medicines,
 {
 name: '',
 dosage: '',
 frequency: '',
 duration: '',
 instructions: '',
 quantity: 0
 }
 ]
 }))
 }

 const removeMedicine = (index: number) => {
 setNewPrescription((prev) => ({
 ...prev,
 medicines: prev.medicines.filter((_, i) => i !== index)
 }))
 }

 const updateMedicine = (index: number, field: keyof Medicine, value: string | number) => {
 setNewPrescription((prev) => {
 const updated = [...prev.medicines]
 updated[index] = { ...updated[index], [field]: value }
 return { ...prev, medicines: updated }
 })
 }

 const getMedicineIcon = (name: string) => {
 const lower = name.toLowerCase()
 if (lower.includes('injection') || lower.includes('insulin')) return <FaSyringe className="text-red-500" />
 if (lower.includes('capsule')) return <FaCapsules className="text-green-500" />
 if (lower.includes('tablet') || lower.includes('pill')) return <FaTablets className="text-blue-500" />
 return <FaPills className="text-purple-500" />
 }

 const filterPrescriptions = (prescriptionList: Prescription[]) => {
 return prescriptionList.filter((prescription) => {
 const q = searchQuery.toLowerCase()
 const matchesSearch =
 prescription.patientName?.toLowerCase().includes(q) ||
 prescription.diagnosis?.toLowerCase().includes(q) ||
 prescription.medicines?.some((med: Medicine) => med.name?.toLowerCase().includes(q))

 const matchesStatus =
 filters.status === 'all' || (filters.status === 'active' ? prescription.isActive : !prescription.isActive)

 const matchesPatient = filters.patient === 'all' || prescription.patientId === filters.patient

 return matchesSearch && matchesStatus && matchesPatient
 })
 }

 const sections: {
 id: 'active' | 'new' | 'templates' | 'history'
 label: string
 icon: IconType
 color: 'green' | 'blue' | 'purple' | 'orange'
 count?: number
 }[] = [
 {
 id: 'active',
 label: 'Active Prescriptions',
 icon: FaPrescriptionBottle,
 color: 'green',
 count: prescriptions.filter((p: Prescription) => p.isActive).length
 },
 { id: 'new', label: 'New Prescription', icon: FaPlus, color: 'blue' },
 { id: 'templates', label: 'Templates', icon: FaClipboardList, color: 'purple', count: templates.length },
 { id: 'history', label: 'History', icon: FaHistory, color: 'orange', count: prescriptions.length }
 ]

 const renderPrescriptionCard = (prescription: Prescription) => (
 <div
 key={prescription.id}
 className="bg-white/30 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
 >
 <div className="p-4 sm:p-5 md:p-6">
 <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
 <div className="flex items-start gap-3 sm:gap-4">
 <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-brand-teal rounded-lg sm:rounded-xl flex items-center justify-center text-white flex-shrink-0">
 <FaPrescriptionBottle className="text-lg sm:text-xl md:text-2xl" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-2">
 <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{prescription.patientName}</h3>
 <span
 className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium border ${
 prescription.isActive
 ? 'bg-sky-50 text-green-800 border-green-200'
 : 'bg-sky-50 text-gray-800 border-gray-200'
 }`}
 >
 {prescription.isActive ? <FaCheckCircle className="inline mr-1" /> : <FaArchive className="inline mr-1" />}
 {prescription.isActive ? 'Active' : 'Inactive'}
 </span>
 {prescription.nextRefill && (
 <span className="text-xs sm:text-sm text-orange-600 font-medium">
 <FaRedo className="inline mr-1" />
 Refill: {new Date(prescription.nextRefill).toLocaleDateString()}
 </span>
 )}
 </div>

 <div className="space-y-1 text-xs sm:text-sm text-gray-600 mb-3">
 <p className="font-medium text-gray-800">
 <FaHeartbeat className="inline mr-1 text-red-500" />
 {prescription.diagnosis}
 </p>
 <div className="flex flex-wrap gap-3 md:gap-4">
 <div className="flex items-center gap-1">
 <FaCalendarAlt className="text-blue-500" />
 <span>{new Date(prescription.date).toLocaleDateString()}</span>
 </div>
 <div className="flex items-center gap-1">
 <FaPills className="text-purple-500" />
 <span>{prescription.medicines?.length || 0} medicines</span>
 </div>
 </div>
 </div>

 {/* Medicine Chips */}
 <div className="flex flex-wrap gap-1.5 sm:gap-2">
 {prescription.medicines?.slice(0, 3).map((med: Medicine, index: number) => (
 <span
 key={index}
 className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white text-blue-800 rounded-full text-xs border border-blue-200 flex items-center gap-1"
 >
 {getMedicineIcon(med.name)}
 {med.name} - {med.dosage}
 </span>
 ))}
 {prescription.medicines?.length > 3 && (
 <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white text-gray-600 rounded-full text-xs border border-gray-200">
 +{prescription.medicines.length - 3} more
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-2 sm:flex-shrink-0">
 <button
 onClick={() =>
 setExpandedPrescription(expandedPrescription === prescription.id ? null : prescription.id)
 }
 className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white transition flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
 >
 <FaFileAlt />
 <span className="hidden sm:inline">
 {expandedPrescription === prescription.id ? 'Less' : 'Details'}
 </span>
 </button>

 <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white transition flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
 <FaPrint />
 <span className="hidden sm:inline">Print</span>
 </button>

 <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white transition flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
 <FaEdit />
 <span className="hidden sm:inline">Edit</span>
 </button>
 </div>
 </div>

 {/* Expanded Details */}
 {expandedPrescription === prescription.id && (
 <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 space-y-3 sm:space-y-4">
 {/* Medicines */}
 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4">
 <h4 className="font-semibold text-green-800 mb-3 text-sm sm:text-base">Prescribed Medicines</h4>
 <div className="space-y-2">
 {prescription.medicines?.map((med: Medicine, index: number) => (
 <div key={index} className="bg-white/80 rounded-lg p-3 border border-green-200">
 <div className="flex items-start gap-2">
 <div className="mt-1">{getMedicineIcon(med.name)}</div>
 <div className="flex-1 text-xs sm:text-sm">
 <p className="font-semibold text-gray-800">{med.name}</p>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1 text-gray-600">
 <span>
 <strong>Dosage:</strong> {med.dosage}
 </span>
 <span>
 <strong>Frequency:</strong> {med.frequency}
 </span>
 <span>
 <strong>Duration:</strong> {med.duration}
 </span>
 <span>
 <strong>Quantity:</strong> {med.quantity}
 </span>
 </div>
 {med.instructions && (
 <p className="mt-1 text-gray-700">
 <strong>Instructions:</strong> {med.instructions}
 </p>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Notes & Signature */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 {prescription.notes && (
 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4">
 <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Notes</h4>
 <p className="text-xs sm:text-sm text-gray-600">{prescription.notes}</p>
 </div>
 )}

 {prescription.signatureUrl && (
 <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4">
 <h4 className="font-semibold text-purple-800 mb-2 text-sm sm:text-base">Digital Signature</h4>
 <div className="flex items-center gap-2">
 <FaSignature className="text-purple-600" />
 <span className="text-xs sm:text-sm text-gray-600">
 Dr. {doctorData.firstName} {doctorData.lastName}
 </span>
 </div>
 </div>
 )}
 </div>

 {/* Action Bar */}
 <div className="flex flex-wrap gap-2 sm:gap-3">
 <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white transition flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
 <FaDownload />
 Download PDF
 </button>
 <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white transition flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
 <FaPrint />
 Print
 </button>
 <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white transition flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
 <FaRedo />
 Refill
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 )

 const renderNewPrescription = () => (
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg border border-blue-200">
 <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6">Create New Prescription</h3>

 <form className="space-y-4 sm:space-y-6" onSubmit={async (e) => {
 e.preventDefault()
 if (!onCreatePrescription) return
 if (!newPrescription.patientId || !newPrescription.diagnosis || newPrescription.medicines.every(m => !m.name)) {
 setSubmitError('Please fill in patient, diagnosis, and at least one medicine name.')
 return
 }
 setSubmitting(true)
 setSubmitError('')
 setSubmitSuccess('')
 try {
 await onCreatePrescription(newPrescription)
 setSubmitSuccess('Prescription created successfully!')
 setNewPrescription({
 patientId: '',
 diagnosis: '',
 medicines: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: 0 }],
 notes: '',
 })
 setTimeout(() => setSubmitSuccess(''), 3000)
 } catch (error: unknown) {
 setSubmitError(error instanceof Error ? error.message : 'Failed to create prescription')
 } finally {
 setSubmitting(false)
 }
 }}>
 {submitError && (
 <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{submitError}</div>
 )}
 {submitSuccess && (
 <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{submitSuccess}</div>
 )}
 {/* Patient Selection */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
 <div>
 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Patient</label>
 <select
 value={newPrescription.patientId}
 onChange={(e) => setNewPrescription({ ...newPrescription, patientId: e.target.value })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 >
 <option value="">Select Patient</option>
 {patients.map((patient: Patient) => (
 <option key={patient.id} value={patient.id}>
 {patient.firstName} {patient.lastName}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Use Template</label>
 <select
 value={selectedTemplate}
 onChange={(e) => setSelectedTemplate(e.target.value)}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 >
 <option value="">Select Template (Optional)</option>
 {templates.map((template: TemplateItem) => (
 <option key={template.id} value={template.id}>
 {template.name} - {template.condition}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Diagnosis */}
 <div>
 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
 <textarea
 value={newPrescription.diagnosis}
 onChange={(e) => setNewPrescription({ ...newPrescription, diagnosis: e.target.value })}
 rows={2}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 placeholder="Enter diagnosis..."
 />
 </div>

 {/* Medicines */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <label className="text-xs sm:text-sm font-medium text-gray-700">Medicines</label>
 <button
 type="button"
 onClick={addMedicine}
 className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white transition flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
 >
 <FaPlus />
 Add Medicine
 </button>
 </div>

 {newPrescription.medicines.map((medicine, index) => (
 <div
 key={index}
 className="bg-white/30 rounded-lg p-3 sm:p-4 border border-gray-200"
 >
 <div className="flex items-center justify-between mb-3">
 <h4 className="text-sm sm:text-base font-medium text-gray-700 flex items-center gap-2">
 <FaPills className="text-blue-500" />
 Medicine {index + 1}
 </h4>
 {newPrescription.medicines.length > 1 && (
 <button
 type="button"
 onClick={() => removeMedicine(index)}
 className="text-red-500 hover:text-red-700 transition"
 >
 <FaTrash />
 </button>
 )}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <input
 type="text"
 placeholder="Medicine Name"
 value={medicine.name}
 onChange={(e) => updateMedicine(index, 'name', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="text"
 placeholder="Dosage (e.g., 500mg)"
 value={medicine.dosage}
 onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="text"
 placeholder="Frequency (e.g., Twice daily)"
 value={medicine.frequency}
 onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="text"
 placeholder="Duration (e.g., 7 days)"
 value={medicine.duration}
 onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="number"
 placeholder="Quantity"
 value={medicine.quantity}
 onChange={(e) => updateMedicine(index, 'quantity', parseInt(e.target.value, 10) || 0)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 <input
 type="text"
 placeholder="Instructions"
 value={medicine.instructions}
 onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 />
 </div>
 </div>
 ))}
 </div>

 {/* Notes */}
 <div>
 <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
 <textarea
 value={newPrescription.notes}
 onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })}
 rows={3}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
 placeholder="Enter any additional instructions or notes..."
 />
 </div>

 <button
 type="submit"
 disabled={submitting}
 className="w-full bg-white transition text-sm sm:text-base disabled:opacity-50"
 >
 {submitting ? 'Creating...' : 'Create Prescription'}
 </button>
 </form>
 </div>
 )

 const renderTemplates = () => (
 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
 {templates.map((template: TemplateItem) => (
 <div
 key={template.id}
 className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-200 hover:shadow-lg transition-all cursor-pointer"
 >
 <div className="flex items-start gap-3">
 <div className="p-2 bg-sky-50 rounded-lg">
 <FaClipboardList className="text-purple-600 text-lg" />
 </div>
 <div className="flex-1">
 <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{template.name}</h4>
 <p className="text-xs sm:text-sm text-gray-600 mt-1">{template.condition}</p>
 <div className="mt-2 space-y-1">
 {template.medicines?.slice(0, 2).map((med: string, index: number) => (
 <span key={index} className="block text-xs text-purple-700">
 • {med}
 </span>
 ))}
 {template.medicines?.length > 2 && (
 <span className="block text-xs text-gray-500">
 +{template.medicines.length - 2} more medicines
 </span>
 )}
 </div>
 <button className="mt-3 px-3 py-1 bg-white transition">
 Use Template
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 <button className="w-full py-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 transition flex items-center justify-center gap-2">
 <FaPlus />
 Create New Template
 </button>
 </div>
 )

 return (
 <div className="space-y-4 sm:space-y-5 md:space-y-6">
 {/* Header */}
 <div className="bg-brand-navy rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white">
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
 <div>
 <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 flex items-center">
 <FaPrescriptionBottle className="mr-2 sm:mr-3" />
 Prescription System
 </h2>
 <p className="opacity-90 text-xs sm:text-sm md:text-base">Manage prescriptions and medications</p>
 </div>
 <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
 <div className="bg-sky-100/20 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
 <p className="text-lg sm:text-xl md:text-2xl font-bold">
 {prescriptions.filter((p: Prescription) => p.isActive).length}
 </p>
 <p className="text-xs opacity-90">Active</p>
 </div>
 <div className="bg-sky-100/20 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
 <p className="text-lg sm:text-xl md:text-2xl font-bold">{prescriptions.length}</p>
 <p className="text-xs opacity-90">Total</p>
 </div>
 <div className="bg-sky-100/20 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
 <p className="text-lg sm:text-xl md:text-2xl font-bold">{templates.length}</p>
 <p className="text-xs opacity-90">Templates</p>
 </div>
 </div>
 </div>
 </div>

 {/* Search & Filters */}
 <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-200">
 <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
 <div className="flex-1 relative">
 <FaSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
 <input
 type="text"
 placeholder="Search prescriptions..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition text-sm sm:text-base"
 />
 </div>

 <button
 onClick={() => setShowFilters(!showFilters)}
 className="px-4 sm:px-6 py-2.5 sm:py-3 bg-sky-50 text-gray-700 rounded-lg sm:rounded-xl transition flex items-center justify-center gap-2 text-sm sm:text-base"
 >
 <FaFilter />
 <span className="hidden sm:inline">Filters</span>
 {showFilters ? <FaChevronUp /> : <FaChevronDown />}
 </button>
 </div>

 {showFilters && (
 <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-3 md:gap-4">
 <select
 value={filters.status}
 onChange={(e) => setFilters({ ...filters, status: e.target.value as FilterOptions['status'] })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm sm:text-base"
 >
 <option value="all">All Status</option>
 <option value="active">Active</option>
 <option value="inactive">Inactive</option>
 </select>

 <select
 value={filters.patient}
 onChange={(e) => setFilters({ ...filters, patient: e.target.value })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm sm:text-base"
 >
 <option value="all">All Patients</option>
 {patients.map((patient: Patient) => (
 <option key={patient.id} value={patient.id}>
 {patient.firstName} {patient.lastName}
 </option>
 ))}
 </select>

 <select
 value={filters.dateRange}
 onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as FilterOptions['dateRange'] })}
 className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-sm sm:text-base"
 >
 <option value="all">All Time</option>
 <option value="week">This Week</option>
 <option value="month">This Month</option>
 <option value="year">This Year</option>
 </select>
 </div>
 )}
 </div>

 {/* Mobile Accordion / Desktop Tabs */}
 <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
 {/* Desktop Tabs */}
 <div className="hidden sm:block border-b border-gray-200">
 <div className="flex overflow-x-auto">
 {sections.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as typeof activeTab)}
 className={`flex-shrink-0 px-3 md:px-6 py-3 md:py-4 text-center font-medium transition-all flex items-center gap-1.5 md:gap-2 ${
 activeTab === tab.id
 ? `text-${tab.color}-600 border-b-2 border-current from-${tab.color}-50 to-transparent`
 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
 }`}
 title={tab.label}
 >
 <tab.icon className="text-base md:text-base" />
 <span className="hidden md:inline whitespace-nowrap text-sm md:text-base">{tab.label}</span>
 {typeof tab.count === 'number' && tab.count > 0 && (
 <span className="bg-gray-500 text-white text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
 )}
 </button>
 ))}
 </div>
 </div>

 {/* Content */}
 <div className="p-4 md:p-6 pb-20 sm:pb-0">
 {activeTab === 'active' && (
 <div className="space-y-3 sm:space-y-4">
 {filterPrescriptions(prescriptions.filter((p: Prescription) => p.isActive)).map(
 renderPrescriptionCard
 )}
 {filterPrescriptions(prescriptions.filter((p: Prescription) => p.isActive)).length === 0 && (
 <div className="text-center py-8">
 <FaPrescriptionBottle className="text-gray-400 text-4xl mx-auto mb-3" />
 <p className="text-gray-500">No active prescriptions</p>
 </div>
 )}
 </div>
 )}
 {activeTab === 'new' && renderNewPrescription()}
 {activeTab === 'templates' && renderTemplates()}
 {activeTab === 'history' && (
 <div className="space-y-3 sm:space-y-4">
 {filterPrescriptions(prescriptions).map(renderPrescriptionCard)}
 {filterPrescriptions(prescriptions).length === 0 && (
 <div className="text-center py-8">
 <FaHistory className="text-gray-400 text-4l mx-auto mb-3" />
 <p className="text-gray-500">No prescription history</p>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-50 shadow-lg">
 {sections.map((section) => {
 const Icon = section.icon
 const isActive = activeTab === section.id
 return (
 <button key={section.id} onClick={() => setActiveTab(section.id as typeof activeTab)}
 className={`flex flex-col items-center justify-center p-1 min-w-[40px] ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
 <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
 {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-1" />}
 </button>
 )
 })}
 </div>
 </div>
 )
}

export default PrescriptionSystem
