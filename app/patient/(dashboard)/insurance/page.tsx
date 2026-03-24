'use client'

import { usePatientData } from '../context'
import InsuranceInfo from '../components/InsuranceInfo'

export default function InsurancePage() {
 const patientData = usePatientData()
 return <InsuranceInfo patientData={patientData} />
}
