'use client'

import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import EmergencyServices from '@/app/patient/(dashboard)/components/EmergencyServices'

export default function PageName() {
 const { patientData, loading } = useUserAsPatient()
 if (loading || !patientData) return null
 return <EmergencyServices patientData={patientData} />
}
