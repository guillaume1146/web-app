'use client'

import { usePatientData } from '../context'
import LabResults from '../components/LabResults'

export default function LabResultsPage() {
 const patientData = usePatientData()
 return <LabResults patientData={patientData} />
}
