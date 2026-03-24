'use client'

import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import PrescriptionManagement from '@/app/patient/(dashboard)/components/PrescriptionManagement'

export default function MyPrescriptionsPage() {
 const { patientData, loading } = useUserAsPatient()
 if (loading || !patientData) return null
 return <PrescriptionManagement patientData={patientData} />
}
