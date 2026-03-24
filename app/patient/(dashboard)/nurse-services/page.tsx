'use client'

import { useRouter } from 'next/navigation'
import { usePatientData } from '../context'
import NurseServices from '../components/NurseServices'

export default function NurseServicesPage() {
 const patientData = usePatientData()
 const router = useRouter()
 return <NurseServices patientData={patientData} onVideoCall={() => router.push('/patient/video')} />
}
