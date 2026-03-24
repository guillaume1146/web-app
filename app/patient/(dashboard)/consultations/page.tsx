'use client'

import { useRouter } from 'next/navigation'
import { usePatientData } from '../context'
import DoctorConsultations from '../components/DoctorConsultations'

export default function ConsultationsPage() {
 const patientData = usePatientData()
 const router = useRouter()
 return <DoctorConsultations patientData={patientData} onVideoCall={() => router.push('/patient/video')} />
}
