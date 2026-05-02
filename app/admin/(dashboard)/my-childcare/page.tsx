'use client'

import { useRouter } from 'next/navigation'
import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import ChildcareServices from '@/app/patient/(dashboard)/components/ChildcareServices'

export default function PageName() {
 const { patientData, loading } = useUserAsPatient()
 const router = useRouter()
 if (loading || !patientData) return null
 return <ChildcareServices patientData={patientData} onVideoCall={() => router.push('/insurance/video')} />
}
