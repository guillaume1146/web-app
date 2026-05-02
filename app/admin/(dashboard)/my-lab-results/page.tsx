'use client'

import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import LabResults from '@/app/patient/(dashboard)/components/LabResults'

export default function PageName() {
 const { patientData, loading } = useUserAsPatient()
 if (loading || !patientData) return null
 return <LabResults patientData={patientData} />
}
