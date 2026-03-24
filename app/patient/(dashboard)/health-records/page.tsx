'use client'

import { usePatientData } from '../context'
import HealthRecords from '../components/HealthRecords'

export default function HealthRecordsPage() {
 const patientData = usePatientData()
 return <HealthRecords patientData={patientData} />
}
