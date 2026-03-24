'use client'

import { useRouter } from 'next/navigation'
import { usePatientData } from '../context'
import ChildcareServices from '../components/ChildcareServices'

export default function ChildcarePage() {
 const patientData = usePatientData()
 const router = useRouter()
 return <ChildcareServices patientData={patientData} onVideoCall={() => router.push('/patient/video')} />
}
