'use client'

import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import PrescriptionManagement from '@/app/patient/(dashboard)/components/PrescriptionManagement'

export default function PharmacistPrescriptionsPage() {
 const { patientData, loading } = useUserAsPatient()
 if (loading || !patientData) return null
 return <PrescriptionManagement patientData={patientData} />
}
