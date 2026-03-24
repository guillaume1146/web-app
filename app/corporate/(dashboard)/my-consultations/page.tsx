'use client'

import { useRouter } from 'next/navigation'
import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import DoctorConsultations from '@/app/patient/(dashboard)/components/DoctorConsultations'

export default function PageName() {
 const { patientData, loading } = useUserAsPatient()
 const router = useRouter()
 if (loading || !patientData) return null
 return <DoctorConsultations patientData={patientData} onVideoCall={() => router.push('/corporate/video')} />
}
