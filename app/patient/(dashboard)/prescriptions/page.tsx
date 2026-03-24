'use client'

import { usePatientData } from '../context'
import PrescriptionManagement from '../components/PrescriptionManagement'

export default function PrescriptionsPage() {
 const patientData = usePatientData()
 return <PrescriptionManagement patientData={patientData} />
}
