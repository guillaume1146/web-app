'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { FaSpinner } from 'react-icons/fa'
import { useDoctorData } from '../context'
import PrescriptionSystem from '../components/PrescriptionSystem'

interface NewPrescriptionData {
 patientId: string
 diagnosis: string
 medicines: { name: string; dosage: string; frequency: string; duration: string; instructions: string; quantity: number }[]
 notes: string
}

interface PrescriptionRecord {
 id: string
 patientId: string
 patientName: string
 diagnosis: string
 medicines: { name: string; dosage: string; frequency: string; duration: string; instructions: string; quantity: number }[]
 date: string
 isActive: boolean
 nextRefill?: string
 notes?: string
 signatureUrl?: string
}

interface PatientOption {
 id: string
 firstName: string
 lastName: string
}

interface ApiPatientEntry {
 id: string
 firstName: string
 lastName: string
}

export default function PrescriptionsPage() {
 const user = useDoctorData()
 const searchParams = useSearchParams()
 const preselectedPatientId = searchParams.get('patientId') || ''
 const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([])
 const [patients, setPatients] = useState<PatientOption[]>([])
 const [loading, setLoading] = useState(true)

 const fetchData = useCallback(async () => {
 try {
 const [prescRes, patientRes] = await Promise.all([
 fetch(`/api/doctors/${user.id}/prescriptions`),
 fetch(`/api/doctors/${user.id}/patients`),
 ])
 const [prescJson, patientJson] = await Promise.all([prescRes.json(), patientRes.json()])

 if (prescJson.success) setPrescriptions(prescJson.data)
 if (patientJson.success) {
 setPatients(
 patientJson.data.map((p: ApiPatientEntry) => ({
 id: p.id,
 firstName: p.firstName,
 lastName: p.lastName,
 }))
 )
 }
 } catch (error) {
 console.error('Failed to fetch prescription data:', error)
 } finally {
 setLoading(false)
 }
 }, [user.id])

 useEffect(() => {
 fetchData()
 }, [fetchData])

 const handleCreatePrescription = async (data: NewPrescriptionData) => {
 const res = await fetch(`/api/doctors/${user.id}/prescriptions`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(data),
 })
 const json = await res.json()
 if (!res.ok || !json.success) {
 throw new Error(json.message || 'Failed to create prescription')
 }
 // Refresh list
 await fetchData()
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <FaSpinner className="animate-spin text-3xl text-blue-600" />
 </div>
 )
 }

 return (
 <PrescriptionSystem
 doctorData={{
 firstName: user.firstName,
 lastName: user.lastName,
 prescriptions,
 prescriptionTemplates: [],
 patients: { current: patients },
 }}
 onCreatePrescription={handleCreatePrescription}
 preselectedPatientId={preselectedPatientId}
 />
 )
}
