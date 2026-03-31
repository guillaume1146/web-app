'use client'

import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import HealthRecords from '@/app/patient/(dashboard)/components/HealthRecords'

export default function MyHealthRecordsPage() {
 const { patientData, loading } = useUserAsPatient()
 if (loading || !patientData) return null
 return <HealthRecords patientData={patientData} />
}
