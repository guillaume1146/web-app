'use client'

import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import InsuranceInfo from '@/app/patient/(dashboard)/components/InsuranceInfo'

export default function MyInsurancePage() {
 const { patientData, loading } = useUserAsPatient()
 if (loading || !patientData) return null
 return <InsuranceInfo patientData={patientData} />
}
