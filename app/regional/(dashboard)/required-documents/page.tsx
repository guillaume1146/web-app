'use client'

import { useState, useEffect } from 'react'
import { FaSave, FaSpinner, FaPlus, FaTrash } from 'react-icons/fa'

const USER_TYPES = [
 'DOCTOR', 'NURSE', 'NANNY', 'PHARMACIST', 'LAB_TECHNICIAN',
 'EMERGENCY_WORKER', 'INSURANCE_REP', 'CORPORATE_ADMIN', 'REFERRAL_PARTNER',
]

const DEFAULT_DOCUMENTS: Record<string, string[]> = {
 DOCTOR: ['Medical License', 'ID Card', 'Board Certification', 'Proof of Address'],
 NURSE: ['Nursing License', 'ID Card', 'CPR Certification'],
 NANNY: ['ID Card', 'Childcare Certification', 'Background Check', 'First Aid Certificate'],
 PHARMACIST: ['Pharmacy License', 'ID Card', 'Degree Certificate'],
 LAB_TECHNICIAN: ['Lab Technician License', 'ID Card', 'Degree Certificate'],
 EMERGENCY_WORKER: ['EMT Certification', 'ID Card', 'Driving License', 'First Aid Certificate'],
 INSURANCE_REP: ['Insurance License', 'ID Card', 'Company Authorization'],
 CORPORATE_ADMIN: ['ID Card', 'Company Registration', 'Authorized Representative Letter'],
 REFERRAL_PARTNER: ['ID Card', 'Business Registration'],
}

interface DocConfig {
 documentName: string
 required: boolean
}

export default function RequiredDocumentsPage() {
 const [configs, setConfigs] = useState<Record<string, DocConfig[]>>({})
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [message, setMessage] = useState('')
 const [newDocName, setNewDocName] = useState('')
 const [selectedRole, setSelectedRole] = useState(USER_TYPES[0])

 useEffect(() => {
 fetch('/api/admin/required-documents')
 .then(r => r.json())
 .then(json => {
 if (json.success && Object.keys(json.data).length > 0) {
 setConfigs(json.data)
 } else {
 // Initialize with defaults
 const defaults: Record<string, DocConfig[]> = {}
 for (const [role, docs] of Object.entries(DEFAULT_DOCUMENTS)) {
 defaults[role] = docs.map(d => ({ documentName: d, required: true }))
 }
 setConfigs(defaults)
 }
 })
 .catch(() => {})
 .finally(() => setLoading(false))
 }, [])

 const toggleRequired = (role: string, docName: string) => {
 setConfigs(prev => ({
 ...prev,
 [role]: (prev[role] || []).map(d =>
 d.documentName === docName ? { ...d, required: !d.required } : d
 ),
 }))
 }

 const addDocument = () => {
 if (!newDocName.trim()) return
 setConfigs(prev => ({
 ...prev,
 [selectedRole]: [...(prev[selectedRole] || []), { documentName: newDocName.trim(), required: true }],
 }))
 setNewDocName('')
 }

 const removeDocument = (role: string, docName: string) => {
 setConfigs(prev => ({
 ...prev,
 [role]: (prev[role] || []).filter(d => d.documentName !== docName),
 }))
 }

 const handleSave = async () => {
 setSaving(true)
 setMessage('')
 try {
 const configArray: { userType: string; documentName: string; required: boolean }[] = []
 for (const [userType, docs] of Object.entries(configs)) {
 for (const doc of docs) {
 configArray.push({ userType, documentName: doc.documentName, required: doc.required })
 }
 }

 const res = await fetch('/api/admin/required-documents', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ configs: configArray }),
 })

 if (res.ok) {
 setMessage('Configuration saved successfully')
 } else {
 setMessage('Failed to save configuration')
 }
 } catch {
 setMessage('Error saving configuration')
 } finally {
 setSaving(false)
 }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <FaSpinner className="animate-spin text-4xl text-blue-500" />
 </div>
 )
 }

 return (
 <div className="p-6 max-w-6xl">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Required Documents Configuration</h1>
 <p className="text-gray-600 mt-1">Configure which documents are required for each user role during registration</p>
 </div>
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
 >
 {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
 Save Changes
 </button>
 </div>

 {message && (
 <div className={`p-3 rounded-lg mb-4 ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
 {message}
 </div>
 )}

 {/* Add new document */}
 <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
 <h3 className="text-lg font-semibold mb-3">Add New Document Requirement</h3>
 <div className="flex gap-3">
 <select
 value={selectedRole}
 onChange={(e) => setSelectedRole(e.target.value)}
 className="px-4 py-2 border rounded-lg"
 >
 {USER_TYPES.map(ut => (
 <option key={ut} value={ut}>{ut.replace('_', ' ')}</option>
 ))}
 </select>
 <input
 type="text"
 value={newDocName}
 onChange={(e) => setNewDocName(e.target.value)}
 placeholder="Document name..."
 className="flex-1 px-4 py-2 border rounded-lg"
 onKeyDown={(e) => e.key === 'Enter' && addDocument()}
 />
 <button
 onClick={addDocument}
 className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
 >
 <FaPlus /> Add
 </button>
 </div>
 </div>

 {/* Documents per role */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {USER_TYPES.map(role => (
 <div key={role} className="bg-white rounded-xl shadow-lg p-6">
 <h3 className="text-lg font-semibold mb-4 text-gray-900">{role.replace('_', ' ')}</h3>
 <div className="space-y-3">
 {(configs[role] || []).map(doc => (
 <div key={doc.documentName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 checked={doc.required}
 onChange={() => toggleRequired(role, doc.documentName)}
 className="w-4 h-4 text-blue-600 rounded"
 />
 <span className={`text-sm ${doc.required ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
 {doc.documentName}
 </span>
 </div>
 <button
 onClick={() => removeDocument(role, doc.documentName)}
 className="text-red-400 hover:text-red-600 transition-colors"
 title="Remove document"
 >
 <FaTrash size={12} />
 </button>
 </div>
 ))}
 {(!configs[role] || configs[role].length === 0) && (
 <p className="text-gray-400 text-sm italic">No documents configured</p>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )
}
