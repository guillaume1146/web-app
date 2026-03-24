'use client'

import { useRouter } from 'next/navigation'
import { useUserAsPatient } from '@/lib/dashboard/useUserAsPatient'
import NurseServices from '@/app/patient/(dashboard)/components/NurseServices'

export default function MyNurseServicesPage() {
 const { patientData, loading } = useUserAsPatient()
 const router = useRouter()
 if (loading || !patientData) return null
 return <NurseServices patientData={patientData} onVideoCall={() => router.push('/referral-partner/video')} />
}
