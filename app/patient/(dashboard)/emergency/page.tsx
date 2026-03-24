'use client'

import { usePatientData } from '../context'
import EmergencyServices from '../components/EmergencyServices'

export default function EmergencyPage() {
 const patientData = usePatientData()
 return <EmergencyServices patientData={patientData} />
}
